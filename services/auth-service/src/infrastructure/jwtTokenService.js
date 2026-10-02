const jwt = require("jsonwebtoken");
const { unauthenticated } = require("../domain/errors");
const { isValidRole } = require("../domain/roles");

class JwtTokenService {
    constructor({ secret, expiresInSeconds }) {
        if (!secret || secret.length < 32) {
            throw new Error("JWT_SECRET must be set and at least 32 characters");
        }
        if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
            throw new Error("JWT_EXPIRES_IN_SECONDS must be a positive integer");
        }
        this.secret = secret;
        this.expiresInSeconds = expiresInSeconds;
    }

    issue({ uid, role }) {
        const accessToken = jwt.sign({ role }, this.secret, {
            algorithm: "HS256",
            subject: String(uid),
            expiresIn: this.expiresInSeconds
        });
        return { accessToken, expiresIn: this.expiresInSeconds };
    }

    verify(token) {
        let payload;
        try {
            // Ghim thuật toán để chặn tấn công "alg: none".
            payload = jwt.verify(token, this.secret, { algorithms: ["HS256"] });
        } catch {
            throw unauthenticated("Invalid or expired token");
        }
        const uid = Number(payload.sub);
        if (!Number.isInteger(uid) || !isValidRole(payload.role)) {
            throw unauthenticated("Invalid token claims");
        }
        return { uid, role: payload.role, exp: payload.exp };
    }
}

module.exports = { JwtTokenService };