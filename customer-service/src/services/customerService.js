const customerRepository = require("../repositories/customerRepository");

const createCustomer = async (fullname, phone, email) => {
    return await customerRepository.createCustomer(
        fullname,
        phone,
        email
    );
};

const getAllCustomers = async () => {
    return await customerRepository.getAllCustomers();
};

const getCustomerById = async (id) => {
    return await customerRepository.getCustomerById(id);
};

const updateCustomer = async (id, fullname, phone, email) => {
    return await customerRepository.updateCustomer(
        id,
        fullname,
        phone,
        email
    );
};

const deleteCustomer = async (id) => {
    return await customerRepository.deleteCustomer(id);
};

module.exports = {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
};