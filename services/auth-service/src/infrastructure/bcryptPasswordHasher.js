const bcrypt = require("bcrypt");

class BcryptPasswordHasher {
    constructor(cost = 10) {
        this.cost = cost;
    }
    hash(plain) {
        return bcrypt.hash(plain, this.cost);
    }
    compare(plain, hash) {
        return bcrypt.compare(plain, hash);
    }
}

module.exports = { BcryptPasswordHasher };