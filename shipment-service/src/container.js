// Composition root: nơi DUY NHẤT nối use case với cài đặt hạ tầng.
const { CreateShipmentFromOrder } = require("./application/createShipmentFromOrder");
const { GetShipment, GetShipmentByOrder } = require("./application/getShipment");
const { UpdateShipmentStatus } = require("./application/updateShipmentStatus");
const { MongoShipmentRepository } = require("./infrastructure/mongoShipmentRepository");

const buildContainer = ({ db }) => {
    const shipmentRepository = new MongoShipmentRepository(db);
    return {
        shipmentRepository,
        createShipmentFromOrder: new CreateShipmentFromOrder({ shipmentRepository }),
        getShipment: new GetShipment({ shipmentRepository }),
        getShipmentByOrder: new GetShipmentByOrder({ shipmentRepository }),
        updateShipmentStatus: new UpdateShipmentStatus({ shipmentRepository })
    };
};

module.exports = { buildContainer };