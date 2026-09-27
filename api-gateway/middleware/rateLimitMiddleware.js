const { redisClient } = require("../config/redis");

const rateLimit = async (req, res, next) => {
    try {
        const key = `rate_limit:${req.ip}`;

        const current = await redisClient.incr(key);

        if (current === 1) {
            await redisClient.expire(key, 60);
        }

        if (current > 10) {
            return res.status(429).json({
                message: "Too many requests"
            });
        }

        next();
    } catch (error) {
        console.error("Rate limit error:", error);

        next();
    }
};

module.exports = rateLimit;