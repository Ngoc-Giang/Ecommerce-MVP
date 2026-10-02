const { HttpError } = require("../grpc/errorMapping");

// (1) tra cache Redis, (2) chưa có thì hỏi Auth Service qua gRPC rồi ghi cache.
// Thành công: gắn req.user = { uid, role }.
const authenticate = ({ authClient, tokenCache }) => async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header) throw new HttpError(401, "Authorization header is required");
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) throw new HttpError(401, "Invalid authorization format");
    const token = match[1];

    let user = await tokenCache.get(token);
    if (!user) {
        const verified = await authClient.verifyToken(token, req.id);
        user = { uid: verified.uid, role: verified.role };
        await tokenCache.set(token, verified);
    }
    req.user = user;
    next();
};

module.exports = { authenticate };