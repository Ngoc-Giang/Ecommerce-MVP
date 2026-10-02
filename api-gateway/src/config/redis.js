const { createClient } = require("redis");

const createRedis = (url, logger) => {
    const client = createClient({
        url,
        disableOfflineQueue: true,
        socket: {
            connectTimeout: 2000,
            reconnectStrategy: (retries) => Math.min(retries * 200, 2000)
        }
    });
    client.on("error", (error) => logger.warn({ err: error.message }, "redis error"));
    client.connect().catch(() => {}); // không chặn khởi động; tự kết nối lại nền
    return client;
};

module.exports = { createRedis };