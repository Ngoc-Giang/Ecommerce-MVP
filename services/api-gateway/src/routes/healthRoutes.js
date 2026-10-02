const express = require("express");

const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

// API-HEALTH-01: GET /api/health. 503 nếu một phụ thuộc bắt buộc không sẵn sàng.
// `services` là { "tên-service": client } — client nào cũng chỉ cần có isReady(ms). Thêm service mới chỉ sửa createApp.
const healthRoutes = ({ redis, services }) => {
    const router = express.Router();
    const names = Object.keys(services);

    router.get("/", async (_req, res) => {
        const [redisUp, ...serviceUp] = await Promise.all([
            withTimeout(redis.ping(), 1000).then(() => true, () => false),
            ...names.map((name) => services[name].isReady(1000))
        ]);
        const dependencies = { redis: redisUp ? "UP" : "DOWN" };
        names.forEach((name, i) => { dependencies[name] = serviceUp[i] ? "UP" : "DOWN"; });
        const up = redisUp && serviceUp.every(Boolean);
        res.status(up ? 200 : 503).json({
            status: up ? "UP" : "DOWN",
            message: up ? "E-commerce API is running" : "Some dependencies are unavailable",
            dependencies
        });
    });

    return router;
};

module.exports = { healthRoutes };