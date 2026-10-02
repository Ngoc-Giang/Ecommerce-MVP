const { notFound } = require("../domain/errors");
const { validatePid } = require("../domain/validation");

class GetProduct {
    constructor({ productRepository }) {
        this.productRepository = productRepository;
    }

    async execute({ pid }) {
        const product = await this.productRepository.findByPid(validatePid(pid));
        if (!product) throw notFound("Product not found");
        return product;
    }
}

module.exports = { GetProduct };