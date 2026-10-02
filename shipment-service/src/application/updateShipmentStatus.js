const { validateShipid, validateStatus } = require("../domain/validation");
const { notFound } = require("../domain/errors");

// UC11. Đề chỉ nêu danh sách trạng thái hợp lệ, không quy định thứ tự chuyển trạng thái nên không tự đặt thêm luật.
class UpdateShipmentStatus {
    constructor({ shipmentRepository }) {
        this.shipmentRepository = shipmentRepository;
    }

    async execute({ shipid, status }) {
        validateShipid(shipid);
        validateStatus(status);
        const shipment = await this.shipmentRepository.updateStatus(shipid, status);
        if (!shipment) throw notFound("Shipment not found");
        return shipment;
    }
}

module.exports = { UpdateShipmentStatus };