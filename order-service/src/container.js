// Composition root: nơi DUY NHẤT nối use case với cài đặt hạ tầng.
const { CreateOrder } = require("./application/createOrder");
const { GetOrder } = require("./application/getOrder");
const { ListOrders } = require("./application/listOrders");
const { PgOrderRepository } = require("./infrastructure/pgOrderRepository");

const buildContainer = ({ pool, customerGateway, productGateway, logger = console }) => {
    const orderRepository = new PgOrderRepository(pool);
    return {
        orderRepository,
        createOrder: new CreateOrder({ orderRepository, customerGateway, productGateway, logger }),
        getOrder: new GetOrder({ orderRepository }),
        listOrders: new ListOrders({ orderRepository })
    };
};

module.exports = { buildContainer };