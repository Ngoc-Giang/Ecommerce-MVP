const { validateShipid, validateOid } = require("../domain/validation");
const { notFound } = require("../domain/errors");

class GetShipment {
    constructor({ shipmentRepository }) {
        this.shipmentRepository = shipmentRepository;
    }

    async execute({ shipid }) {
        validateShipid(shipid);
        const shipment = await this.shipmentRepository.findByShipid(shipid);
        if (!shipment) throw notFound("Shipment not found");
        return shipment;
    }
}

class GetShipmentByOrder {
    constructor({ shipmentRepository }) {
        this.shipmentRepository = shipmentRepository;
    }

    async execute({ oid }) {
        validateOid(oid);
        const shipment = await this.shipmentRepository.findByOid(oid);
        if (!shipment) throw notFound("Shipment not found");
        return shipment;
    }
}

module.exports = { GetShipment, GetShipmentByOrder };