// Lỗi nghiệp vụ. Tầng interfaces sẽ ánh xạ code -> mã gRPC.
class DomainError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

const invalidArgument = (message) => new DomainError("INVALID_ARGUMENT", message);
const notFound = (message) => new DomainError("NOT_FOUND", message);

module.exports = { DomainError, invalidArgument, notFound };