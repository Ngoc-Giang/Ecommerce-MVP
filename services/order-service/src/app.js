require("dotenv").config();

const express = require("express");
const { createPool } = require("./infrastructure/database");
const { GrpcCustomerGateway, GrpcProductGateway } = require("./infrastructure/grpcClients");
const { KafkaEventPublisher } = require("./infrastructure/kafkaEventPublisher");
const { OutboxRelay } = require("./infrastructure/outboxRelay");
const { buildContainer } = require("./container");
const { createGrpcServer, listen } = require("./interfaces/grpc/orderServer");

const TOPIC_BY_EVENT_TYPE = { OrderCreated: "order-created" };
const topicFor = (eventType) => {
    const topic = TOPIC_BY_EVENT_TYPE[eventType];
    if (!topic) throw new Error(`No topic configured for event type ${eventType}`);
    return topic;
};

const main = async () => {
    const env = process.env;
    const pool = createPool(env);
    await pool.query("SELECT 1"); // fail fast nếu DB chưa sẵn sàng

    const timeoutMs = Number(env.GRPC_TIMEOUT_MS || 3000);
    const customerGateway = new GrpcCustomerGateway({ url: env.CUSTOMER_GRPC_URL || "localhost:50052", timeoutMs });
    const productGateway = new GrpcProductGateway({ url: env.PRODUCT_GRPC_URL || "localhost:50053", timeoutMs });
    const container = buildContainer({ pool, customerGateway, productGateway });

    // gRPC: cổng nghiệp vụ, chỉ Gateway gọi vào.
    const grpcServer = createGrpcServer({ ...container });
    const grpcPort = await listen(grpcServer, Number(env.GRPC_PORT || 50054));
    console.log(`Order Service gRPC listening on :${grpcPort}`);

    // Outbox relay: chạy nền, Kafka tắt thì OrderCreated nằm chờ trong DB, đơn hàng vẫn tạo được.
    let relay = null;
    let publisher = null;
    if (env.KAFKA_BROKERS) {
        publisher = new KafkaEventPublisher({
            brokers: env.KAFKA_BROKERS.split(","),
            clientId: "order-service",
            topics: Object.values(TOPIC_BY_EVENT_TYPE)
        });
        relay = new OutboxRelay({ pool, publisher, topicFor, intervalMs: Number(env.OUTBOX_POLL_INTERVAL_MS || 1000) });
        relay.start();
        console.log(`Outbox relay started (brokers: ${env.KAFKA_BROKERS})`);
    } else {
        console.warn("KAFKA_BROKERS not set: outbox relay disabled, events stay PENDING");
    }

    // HTTP: chỉ để Docker/hạ tầng kiểm tra sức khoẻ.
    const health = express();
    health.get("/health", async (_req, res) => {
        try {
            await pool.query("SELECT 1");
            res.status(200).json({ service: "order-service", status: "UP" });
        } catch {
            res.status(503).json({ service: "order-service", status: "DOWN" });
        }
    });
    const httpServer = health.listen(Number(env.PORT || 3003), () =>
        console.log(`Order Service health on :${env.PORT || 3003}`)
    );

    const shutdown = () => {
        httpServer.close();
        grpcServer.tryShutdown(async () => {
            if (relay) await relay.stop();
            if (publisher) await publisher.close();
            customerGateway.close();
            productGateway.close();
            await pool.end();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};

main().catch((error) => {
    console.error("Failed to start Order Service:", error.message);
    process.exit(1);
});