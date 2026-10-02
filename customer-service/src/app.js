require("dotenv").config();

const express = require("express");
const { createPool } = require("./infrastructure/database");
const { buildContainer } = require("./container");
const { createGrpcServer, listen } = require("./interfaces/grpc/customerServer");
const { createUserRegisteredHandler } = require("./interfaces/kafka/userRegisteredHandler");
const { KafkaConsumerRunner } = require("./infrastructure/kafkaConsumer");

const main = async () => {
    const env = process.env;
    const pool = createPool(env);
    await pool.query("SELECT 1"); // fail fast nếu DB chưa sẵn sàng

    const container = buildContainer({ pool });

    // gRPC: cổng nghiệp vụ, chỉ Gateway/Order Service gọi vào.
    const grpcServer = createGrpcServer({ ...container });
    const grpcPort = await listen(grpcServer, Number(env.GRPC_PORT || 50052));
    console.log(`Customer Service gRPC listening on :${grpcPort}`);

    // Kafka consumer: nhận UserRegistered từ Auth để tạo Customer. Kafka tắt thì service vẫn phục vụ gRPC.
    let consumer = null;
    if (env.KAFKA_BROKERS) {
        consumer = new KafkaConsumerRunner({
            brokers: env.KAFKA_BROKERS.split(","),
            clientId: "customer-service",
            groupId: "customer-service",
            topic: env.USER_REGISTERED_TOPIC || "user-registered",
            onMessage: createUserRegisteredHandler({ provisionCustomer: container.provisionCustomer })
        });
        consumer.start();
    } else {
        console.warn("KAFKA_BROKERS not set: UserRegistered consumer disabled");
    }

    // HTTP: chỉ để Docker/hạ tầng kiểm tra sức khoẻ.
    const health = express();
    health.get("/health", async (_req, res) => {
        try {
            await pool.query("SELECT 1");
            res.status(200).json({ service: "customer-service", status: "UP" });
        } catch {
            res.status(503).json({ service: "customer-service", status: "DOWN" });
        }
    });
    const httpServer = health.listen(Number(env.PORT || 3002), () =>
        console.log(`Customer Service health on :${env.PORT || 3002}`)
    );

    const shutdown = () => {
        httpServer.close();
        grpcServer.tryShutdown(async () => {
            if (consumer) await consumer.stop();
            await pool.end();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};

main().catch((error) => {
    console.error("Failed to start Customer Service:", error.message);
    process.exit(1);
});