const express = require("express");
const { HttpError } = require("../grpc/errorMapping");
const { authorize } = require("../middleware/authorize");

const MAX_INT32 = 2147483647;

// Chỉ nhận số nguyên dương dạng chữ số thuần.
const parseShipid = (value) => {
    if (!/^[1-9]\d{0,9}$/.test(value) || Number(value) > MAX_INT32) {
        throw new HttpError(400, "shipid must be a positive integer");
    }
    return Number(value);
};

// REST chỉ trả { shipid, oid, status } theo đặc tả; uid (chủ đơn) chỉ dùng nội bộ để kiểm tra quyền.
const toShipment = (s) => ({ shipid: s.shipid, oid: s.oid, status: s.status });

const shipmentRoutes = ({ shipmentClient, authenticateMw }) => {
    const router = express.Router();
    router.use(authenticateMw);

    // API-SHP-01 (UC12): CUSTOMER chỉ xem shipment của đơn của mình (403 nếu của người khác); ADMIN và SHIPMENT_STAFF xem được mọi shipment.
    router.get("/:shipid", authorize("CUSTOMER", "ADMIN", "SHIPMENT_STAFF"), async (req, res) => {
        const shipid = parseShipid(req.params.shipid);
        const shipment = await shipmentClient.getShipment({ shipid }, req.id);
        if (req.user.role === "CUSTOMER" && shipment.uid !== req.user.uid) throw new HttpError(403, "Forbidden");
        res.json(toShipment(shipment));
    });

    // API-SHP-02 (UC11): chỉ SHIPMENT_STAFF hoặc ADMIN. Thứ tự: quyền (403) -> shipid (400) -> body (400) -> gọi service.
    // Trạng thái nào hợp lệ (PENDING, SHIPPING, DELIVERED, CANCELLED) do Shipment Service quyết định (sai -> 400).
    router.patch("/:shipid/status", authorize("SHIPMENT_STAFF", "ADMIN"), async (req, res) => {
        const shipid = parseShipid(req.params.shipid);
        const body = req.body;
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
            throw new HttpError(400, "Request body must be a JSON object");
        }
        if (typeof body.status !== "string" || body.status === "") throw new HttpError(400, "status must be a non-empty string");
        const shipment = await shipmentClient.updateShipmentStatus({ shipid, status: body.status }, req.id);
        res.json(toShipment(shipment));
    });

    return router;
};

module.exports = { shipmentRoutes };