require("dotenv").config();

const express = require("express");
const { connectMongo } = require("./infrastructure/mongo");
const { buildContainer } = require("./container");
const { createGrpcServer, listen } = require("./interfaces/grpc/productServer");

const main = async () => {
    const env = process.env;
    const { client, db } = await connectMongo(env.MONGO_URI);
    const container = buildContainer({ db });

    // gRPC: cổng nghiệp vụ, chỉ Gateway/Order Service gọi vào.
    const grpcServer = createGrpcServer({ ...container });
    const grpcPort = await listen(grpcServer, Number(env.GRPC_PORT || 50053));
    console.log(`Product Service gRPC listening on :${grpcPort}`);

    // HTTP: chỉ để Docker/hạ tầng kiểm tra sức khoẻ.
    const health = express();
    health.get("/health", async (_req, res) => {
        try {
            await db.command({ ping: 1 });
            res.status(200).json({ service: "product-service", status: "UP" });
        } catch {
            res.status(503).json({ service: "product-service", status: "DOWN" });
        }
    });
    const httpServer = health.listen(Number(env.PORT || 3004), () =>
        console.log(`Product Service health on :${env.PORT || 3004}`)
    );

    const shutdown = () => {
        httpServer.close();
        grpcServer.tryShutdown(async () => {
            await client.close();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};

main().catch((error) => {
    console.error("Failed to start Product Service:", error.message);
    process.exit(1);
});