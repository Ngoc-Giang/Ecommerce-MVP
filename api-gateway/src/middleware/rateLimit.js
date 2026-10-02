// Fixed-window theo IP. INCR + EXPIRE chạy trong MỘT script Lua (nguyên tử).
const SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local t = redis.call('TTL', KEYS[1])
if t < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]); t = tonumber(ARGV[1]) end
return {c, t}
`;

class RedisRateLimitStore {
    constructor(redis) {
        this.redis = redis;
    }
    async hit(key, windowSeconds) {
        const [count, ttl] = await this.redis.eval(SCRIPT, { keys: [key], arguments: [String(windowSeconds)] });
        return { count: Number(count), ttl: Number(ttl) };
    }
}

// Redis lỗi -> cho qua (fail-open) và ghi log.
const rateLimit = ({ store, prefix, max, windowSeconds, logger }) => async (req, res, next) => {
    let result;
    try {
        result = await store.hit(`rl:${prefix}:${req.ip}`, windowSeconds);
    } catch (error) {
        logger.warn({ err: error.message }, "rate limit store unavailable, allowing request");
        return next();
    }
    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(Math.max(0, max - result.count)));
    if (result.count > max) {
        res.set("Retry-After", String(result.ttl));
        return res.status(429).json({ message: "Too many requests" });
    }
    next();
};

module.exports = { rateLimit, RedisRateLimitStore };