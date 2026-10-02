class ListProducts {
    constructor({ productRepository }) {
        this.productRepository = productRepository;
    }

    async execute() {
        return { items: await this.productRepository.list() };
    }
}

module.exports = { ListProducts };