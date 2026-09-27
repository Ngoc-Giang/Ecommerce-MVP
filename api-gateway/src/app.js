require("dotenv").config();

const express = require("express");
const {
    createProxyMiddleware,
    fixRequestBody
} = require("http-proxy-middleware");

const { connectRedis } = require("../config/redis");
const rateLimit = require("../middleware/rateLimitMiddleware");

const app = express();

app.use(express.json());

app.use(
    "/auth/login",
    rateLimit
);

app.use(
    createProxyMiddleware({
        target: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
        changeOrigin: true,
        pathFilter: "/auth",
        on: {
            proxyReq: fixRequestBody
        }
    })
);

app.get("/health", (req, res) => {
    return res.status(200).json({
        service: "api-gateway",
        status: "UP"
    });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectRedis();

        app.listen(PORT, () => {
            console.log(`API Gateway running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start API Gateway:", error);
        process.exit(1);
    }
};

startServer();