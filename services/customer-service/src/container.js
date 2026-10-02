// Composition root: nơi DUY NHẤT nối use case với cài đặt hạ tầng.
const { GetCustomer } = require("./application/getCustomer");
const { UpdateCustomer } = require("./application/updateCustomer");
const { ProvisionCustomer } = require("./application/provisionCustomer");
const { PgCustomerRepository } = require("./infrastructure/pgCustomerRepository");

const buildContainer = ({ pool }) => {
    const customerRepository = new PgCustomerRepository(pool);
    return {
        customerRepository,
        getCustomer: new GetCustomer({ customerRepository }),
        updateCustomer: new UpdateCustomer({ customerRepository }),
        provisionCustomer: new ProvisionCustomer({ customerRepository })
    };
};

module.exports = { buildContainer };