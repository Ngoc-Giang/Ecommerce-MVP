const { notFound } = require("../domain/errors");
const { validatePid } = require("../domain/validation");

class DeleteProduct {
    constructor({ productRepository }) {
        this.productRepository = productRepository;
    }

    async execute({ pid }) {
        const id = validatePid(pid);
        if (!(await this.productRepository.remove(id))) throw notFound("Product not found");
        return { pid: id };
    }
}

module.exports = { DeleteProduct };