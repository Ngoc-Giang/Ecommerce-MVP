const { validateOid } = require("../domain/validation");
const { notFound } = require("../domain/errors");
const { totalOf } = require("../domain/pricing");

class GetOrder {
    constructor({ orderRepository }) {
        this.orderRepository = orderRepository;
    }

    async execute({ oid }) {
        validateOid(oid);
        const order = await this.orderRepository.findByOid(oid);
        if (!order) throw notFound("Order not found");
        return { ...order, totalAmount: totalOf(order.items, order.discount) };
    }
}

module.exports = { GetOrder };