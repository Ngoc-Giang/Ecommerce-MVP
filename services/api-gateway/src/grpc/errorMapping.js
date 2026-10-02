const grpc = require("@grpc/grpc-js");

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const STATUS_MAP = {
    [grpc.status.INVALID_ARGUMENT]: 400,
    [grpc.status.UNAUTHENTICATED]: 401,
    [grpc.status.PERMISSION_DENIED]: 403,
    [grpc.status.NOT_FOUND]: 404,
    [grpc.status.ALREADY_EXISTS]: 409,
    [grpc.status.FAILED_PRECONDITION]: 409,
    [grpc.status.RESOURCE_EXHAUSTED]: 429,
    [grpc.status.UNAVAILABLE]: 503,
    [grpc.status.DEADLINE_EXCEEDED]: 504
};

const toHttpError = (error) => {
    if (error instanceof HttpError) return error;
    const status = typeof error?.code === "number" ? STATUS_MAP[error.code] : undefined;
    if (status && status < 500) return new HttpError(status, error.details || "Request failed");
    if (status === 503) return new HttpError(503, "Service temporarily unavailable");
    if (status === 504) return new HttpError(504, "Service timed out");
    return new HttpError(500, "Internal server error");
};

module.exports = { HttpError, toHttpError };