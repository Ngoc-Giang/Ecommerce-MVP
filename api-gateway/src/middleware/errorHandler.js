const { toHttpError } = require("../grpc/errorMapping");

const notFound = (req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
};

const errorHandler = (logger) => (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.parse.failed") return res.status(400).json({ message: "Malformed JSON body" });
    if (error.type === "entity.too.large") return res.status(413).json({ message: "Request body too large" });

    const httpError = toHttpError(error);
    if (httpError.status >= 500) {
        logger.error({ err: error.message, reqId: req.id }, "request failed");
    }
    res.status(httpError.status).json({ message: httpError.message });
};

module.exports = { notFound, errorHandler };