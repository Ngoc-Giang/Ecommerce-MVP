require("dotenv").config();

const pino = require("pino");
const { loadConfig } = require("./config/env");
const { createRedis } = require("./config/redis");
const { AuthClient } = require("./grpc/authClient");
const { CustomerClient } = require("./grpc/customerClient");
const { ProductClient } = require("./grpc/productClient");
const { OrderClient } = require("./grpc/orderClient");
const { ShipmentClient } = require("./grpc/shipmentClient");
const { TokenCache } = require("./cache/tokenCache");
const { RedisRateLimitStore } = require("./middleware/rateLimit");
const { createApp } = require("./createApp");

const config = loadConfig();
const logger = pino({ level: process.env.LOG_LEVEL || "info", base: { service: "api-gateway" } });

const redis = createRedis(config.redisUrl, logger);
const authClient = new AuthClient({ url: config.authGrpcUrl, timeoutMs: config.grpcTimeoutMs });
const customerClient = new CustomerClient({ url: config.customerGrpcUrl, timeoutMs: config.grpcTimeoutMs });
const productClient = new ProductClient({ url: config.productGrpcUrl, timeoutMs: config.grpcTimeoutMs });
const orderClient = new OrderClient({ url: config.orderGrpcUrl, timeoutMs: config.grpcTimeoutMs });
const shipmentClient = new ShipmentClient({ url: config.shipmentGrpcUrl, timeoutMs: config.grpcTimeoutMs });
const app = createApp({
    config,
    logger,
    authClient,
    customerClient,
    productClient,
    orderClient,
    shipmentClient,
    redis,
    tokenCache: new TokenCache({ redis, logger }),
    rateLimitStore: new RedisRateLimitStore(redis)
});

const server = app.listen(config.port, () => logger.info(`API Gateway listening on :${config.port}`));

const shutdown = () => {
    logger.info("shutting down");
    server.close(async () => {
        authClient.close();
        customerClient.close();
        productClient.close();
        orderClient.close();
        shipmentClient.close();
        await redis.quit().catch(() => {});
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);