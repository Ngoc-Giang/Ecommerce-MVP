const { notFound } = require("../domain/errors");
const { validateUid } = require("../domain/validation");

class GetCustomer {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute({ uid }) {
        const customer = await this.customerRepository.findByUid(validateUid(uid));
        if (!customer) throw notFound("Customer not found");
        return customer;
    }
}

module.exports = { GetCustomer };