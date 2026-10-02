require("dotenv").config();

const express = require("express");
const { createPool } = require("./infrastructure/database");
const { buildContainer } = require("./container");
const { seedUsers } = require("./infrastructure/seedUsers");
const { createGrpcServer, listen } = require("./interfaces/grpc/authServer");
const { KafkaEventPublisher } = require("./infrastructure/kafkaEventPublisher");
const { OutboxRelay } = require("./infrastructure/outboxRelay");

// Tên topic Kafka cho từng loại sự kiện (điểm cấu hình duy nhất của phía Auth).
const TOPIC_BY_EVENT_TYPE = { UserRegistered: "user-registered" };

const topicFor = (eventType) => {
    const topic = TOPIC_BY_EVENT_TYPE[eventType];
    if (!topic) throw new Error(`No topic configured for event type ${eventType}`);
    return topic;
};

const main = async () => {
    const env = process.env;
    const pool = createPool(env);
    await pool.query("SELECT 1"); // fail fast nếu DB chưa sẵn sàng

    const container = buildContainer({
        pool,
        jwtSecret: env.JWT_SECRET,
        jwtExpiresInSeconds: Number(env.JWT_EXPIRES_IN_SECONDS || 3600)
    });
    await seedUsers({ env, ...container, log: console });

    // gRPC: cổng nghiệp vụ, chỉ Gateway/service khác gọi vào.
    const grpcServer = createGrpcServer({ ...container });
    const grpcPort = await listen(grpcServer, Number(env.GRPC_PORT || 50051));
    console.log(`Auth Service gRPC listening on :${grpcPort}`);

    // Outbox relay: chạy nền, không chặn khởi động; Kafka tắt thì sự kiện nằm chờ trong DB.
    let relay = null;
    let publisher = null;
    if (env.KAFKA_BROKERS) {
        publisher = new KafkaEventPublisher({
            brokers: env.KAFKA_BROKERS.split(","),
            clientId: "auth-service",
            topics: Object.values(TOPIC_BY_EVENT_TYPE)
        });
        relay = new OutboxRelay({
            pool,
            publisher,
            topicFor,
            intervalMs: Number(env.OUTBOX_POLL_INTERVAL_MS || 1000)
        });
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
            res.status(200).json({ service: "auth-service", status: "UP" });
        } catch {
            res.status(503).json({ service: "auth-service", status: "DOWN" });
        }
    });
    const httpServer = health.listen(Number(env.PORT || 3001), () =>
        console.log(`Auth Service health on :${env.PORT || 3001}`)
    );

    const shutdown = () => {
        httpServer.close();
        grpcServer.tryShutdown(async () => {
            if (relay) await relay.stop();
            if (publisher) await publisher.close();
            await pool.end();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};

main().catch((error) => {
    console.error("Failed to start Auth Service:", error.message);
    process.exit(1);
});