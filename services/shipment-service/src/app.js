require("dotenv").config();

const express = require("express");
const { connectMongo } = require("./infrastructure/mongo");
const { KafkaConsumerRunner } = require("./infrastructure/kafkaConsumer");
const { buildContainer } = require("./container");
const { createGrpcServer, listen } = require("./interfaces/grpc/shipmentServer");
const { createOrderCreatedHandler } = require("./interfaces/kafka/orderCreatedHandler");

const main = async () => {
    const env = process.env;
    const { client, db } = await connectMongo(env.MONGO_URI);

    const container = buildContainer({ db });
    await container.shipmentRepository.init(); // chỉ mục unique trên oid

    // gRPC: cổng nghiệp vụ, chỉ Gateway gọi vào.
    const grpcServer = createGrpcServer({ ...container });
    const grpcPort = await listen(grpcServer, Number(env.GRPC_PORT || 50055));
    console.log(`Shipment Service gRPC listening on :${grpcPort}`);

    // Kafka consumer: nhận OrderCreated từ Order để tạo Shipment. Kafka tắt thì service vẫn phục vụ gRPC.
    let consumer = null;
    if (env.KAFKA_BROKERS) {
        consumer = new KafkaConsumerRunner({
            brokers: env.KAFKA_BROKERS.split(","),
            clientId: "shipment-service",
            groupId: "shipment-service",
            topic: env.ORDER_CREATED_TOPIC || "order-created",
            onMessage: createOrderCreatedHandler({ createShipmentFromOrder: container.createShipmentFromOrder })
        });
        consumer.start();
    } else {
        console.warn("KAFKA_BROKERS not set: OrderCreated consumer disabled");
    }

    // HTTP: chỉ để Docker/hạ tầng kiểm tra sức khoẻ.
    const health = express();
    health.get("/health", async (_req, res) => {
        try {
            await db.command({ ping: 1 });
            res.status(200).json({ service: "shipment-service", status: "UP" });
        } catch {
            res.status(503).json({ service: "shipment-service", status: "DOWN" });
        }
    });
    const httpServer = health.listen(Number(env.PORT || 3005), () =>
        console.log(`Shipment Service health on :${env.PORT || 3005}`)
    );

    const shutdown = () => {
        httpServer.close();
        grpcServer.tryShutdown(async () => {
            if (consumer) await consumer.stop();
            await client.close();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};

main().catch((error) => {
    console.error("Failed to start Shipment Service:", error.message);
    process.exit(1);
});