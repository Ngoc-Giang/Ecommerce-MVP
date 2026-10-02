const { validateOrderCreatedEvent } = require("../domain/validation");

// TC-SHP-01/02/05: nhận OrderCreated -> tạo Shipment PENDING.
//  - Thiếu oid/uid: ném INVALID_ARGUMENT (adapter Kafka sẽ ghi log rồi bỏ qua, không tạo Shipment).
//  - Cùng đơn hàng nhận hai lần (Kafka giao "ít nhất một lần"): KHÔNG tạo trùng, trả về shipment đã có.
class CreateShipmentFromOrder {
    constructor({ shipmentRepository }) {
        this.shipmentRepository = shipmentRepository;
    }

    async execute(event) {
        validateOrderCreatedEvent(event);
        return this.shipmentRepository.createIfAbsent({ oid: event.oid, uid: event.uid });
    }
}

module.exports = { CreateShipmentFromOrder };