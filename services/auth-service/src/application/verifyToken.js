const { unauthenticated } = require("../domain/errors");

class VerifyToken {
    constructor({ tokenService }) {
        this.tokenService = tokenService;
    }

    async execute({ token } = {}) {
        if (!token) throw unauthenticated("Token is required");
        return this.tokenService.verify(token);
    }
}

module.exports = { VerifyToken };