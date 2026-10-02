const crypto = require("crypto");

class TokenCache {
    constructor({ redis, logger, maxTtlSeconds = 300 }) {
        this.redis = redis;
        this.logger = logger;
        this.maxTtlSeconds = maxTtlSeconds;
    }

    key(token) {
        return `auth:token:${crypto.createHash("sha256").update(token).digest("hex")}`;
    }

    async get(token) {
        try {
            const value = await this.redis.get(this.key(token));
            return value ? JSON.parse(value) : null;
        } catch (error) {
            this.logger.warn({ err: error.message }, "token cache read failed");
            return null;
        }
    }

    async set(token, { uid, role, exp }) {
        const ttl = Math.min(exp - Math.floor(Date.now() / 1000), this.maxTtlSeconds);
        if (!(ttl > 0)) return;
        try {
            await this.redis.set(this.key(token), JSON.stringify({ uid, role }), { EX: ttl });
        } catch (error) {
            this.logger.warn({ err: error.message }, "token cache write failed");
        }
    }
}

module.exports = { TokenCache };