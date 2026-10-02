const crypto = require("crypto");
const pinoHttp = require("pino-http");

const requestLogger = (logger) =>
    pinoHttp({
        logger,
        genReqId: (req, res) => {
            const incoming = req.headers["x-request-id"];
            const id = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
            res.setHeader("X-Request-Id", id);
            return id;
        },
        customProps: (req) => ({ uid: req.user?.uid, role: req.user?.role }),
        serializers: {
            req: (req) => ({ id: req.id, method: req.method, path: String(req.url).split("?")[0] }),
            res: (res) => ({ statusCode: res.statusCode })
        }
    });

module.exports = { requestLogger };