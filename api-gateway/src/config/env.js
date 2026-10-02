const toInt = (value, fallback) => {
    const n = Number.parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

const loadConfig = (env = process.env) => ({
    port: toInt(env.PORT, 3000),
    authGrpcUrl: env.AUTH_GRPC_URL || "localhost:50051",
    customerGrpcUrl: env.CUSTOMER_GRPC_URL || "localhost:50052",
    productGrpcUrl: env.PRODUCT_GRPC_URL || "localhost:50053",
    orderGrpcUrl: env.ORDER_GRPC_URL || "localhost:50054",
    shipmentGrpcUrl: env.SHIPMENT_GRPC_URL || "localhost:50055",
    redisUrl: env.REDIS_URL || "redis://localhost:6379",
    grpcTimeoutMs: toInt(env.GRPC_TIMEOUT_MS, 3000),
    rateLimit: {
        windowSeconds: toInt(env.RATE_LIMIT_WINDOW_SECONDS, 60),
        max: toInt(env.RATE_LIMIT_MAX, 100),        // mọi API, theo IP
        authMax: toInt(env.AUTH_RATE_LIMIT_MAX, 10) // đăng ký/đăng nhập, theo IP
    },
    trustProxy: env.TRUST_PROXY === "true"
});

module.exports = { loadConfig };