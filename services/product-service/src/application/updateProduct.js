const { notFound } = require("../domain/errors");
const { validatePid, validateProductData } = require("../domain/validation");

class UpdateProduct {
    constructor({ productRepository }) {
        this.productRepository = productRepository;
    }

    async execute({ pid, ...data }) {
        const id = validatePid(pid);
        const updated = await this.productRepository.replace(id, validateProductData(data));
        if (!updated) throw notFound("Product not found");
        return { pid: id };
    }
}

module.exports = { UpdateProduct };