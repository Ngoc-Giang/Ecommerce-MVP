class DomainError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

const invalidArgument = (message) => new DomainError("INVALID_ARGUMENT", message);
const alreadyExists = (message) => new DomainError("ALREADY_EXISTS", message);
const unauthenticated = (message) => new DomainError("UNAUTHENTICATED", message);

module.exports = { DomainError, invalidArgument, alreadyExists, unauthenticated };