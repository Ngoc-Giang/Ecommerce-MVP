const { validateProductData } = require("../domain/validation");

class CreateProduct {
    constructor({ productRepository }) {
        this.productRepository = productRepository;
    }

    async execute(input) {
        return this.productRepository.create(validateProductData(input));
    }
}

module.exports = { CreateProduct };