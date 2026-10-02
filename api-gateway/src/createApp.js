const express = require("express");
const { requestLogger } = require("./middleware/requestLogger");
const { rateLimit } = require("./middleware/rateLimit");
const { authenticate } = require("./middleware/authenticate");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { authRoutes } = require("./routes/authRoutes");
const { healthRoutes } = require("./routes/healthRoutes");
const { customerRoutes } = require("./routes/customerRoutes");
const { productRoutes } = require("./routes/productRoutes");
const { orderRoutes } = require("./routes/orderRoutes");
const { shipmentRoutes } = require("./routes/shipmentRoutes");

// Nhận mọi phụ thuộc từ ngoài vào (authClient, customerClient, redis, tokenCache, rateLimitStore) để test được bằng đối tượng giả.
const createApp = ({ config, logger, authClient, customerClient, productClient,orderClient, shipmentClient, redis, tokenCache, rateLimitStore }) => {
    const app = express();
    app.disable("x-powered-by");
    if (config.trustProxy) app.set("trust proxy", true);

    app.use(requestLogger(logger));

    // Liveness cho Docker: chỉ cần tiến trình còn sống. Không phụ thuộc Redis/Auth.
    app.get("/health", (_req, res) => res.json({ status: "UP", service: "api-gateway" }));
    // Readiness cho người dùng/giám sát. Đặt TRƯỚC rate limit để luôn kiểm tra được.
    app.use("/api/health", healthRoutes({
       redis,
       services: { "auth-service": authClient, "customer-service": customerClient, "product-service": productClient, "order-service": orderClient, "shipment-service": shipmentClient }
   }));

    // Rate limit chạy TRƯỚC khi đọc body: request rác/quá lớn cũng bị đếm.
    const { windowSeconds, max, authMax } = config.rateLimit;
    app.use("/api", rateLimit({ store: rateLimitStore, prefix: "global", max, windowSeconds, logger }));
    app.use("/api", express.json({ limit: "100kb" }));

    const authLimiter = rateLimit({ store: rateLimitStore, prefix: "auth", max: authMax, windowSeconds, logger });
    app.use("/api/auth", authRoutes({ authClient, authLimiter }));

    // Mọi route dưới đây yêu cầu JWT hợp lệ (xác thực dùng chung, có cache Redis).
    const authenticateMw = authenticate({ authClient, tokenCache });
    app.use("/api/customers", customerRoutes({ customerClient, authenticateMw }));
    app.use("/api/products", productRoutes({ productClient, authenticateMw }));
    app.use("/api/orders", orderRoutes({ orderClient, shipmentClient, authenticateMw }));
    app.use("/api/shipments", shipmentRoutes({ shipmentClient, authenticateMw }));

    app.use(notFound);
    app.use(errorHandler(logger));
    return app;
};

module.exports = { createApp };