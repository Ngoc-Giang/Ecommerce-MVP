const express = require("express");
const grpc = require("@grpc/grpc-js");
const { HttpError } = require("../grpc/errorMapping");
const { authorize } = require("../middleware/authorize");

const MAX_INT32 = 2147483647;
const MAX_QTY = 1000000;
const MAX_ITEMS = 50;

// Chỉ nhận số nguyên dương dạng chữ số thuần.
const parseOid = (value) => {
    if (!/^[1-9]\d{0,9}$/.test(value) || Number(value) > MAX_INT32) {
        throw new HttpError(400, "oid must be a positive integer");
    }
    return Number(value);
};

// Body: { items: [ { pid, qty } ] }. Gateway kiểm tra "có mặt và đúng kiểu" vì proto3 biến trường thiếu/sai kiểu thành 0.
// Các luật nghiệp vụ (trùng pid, tồn kho...) do Order Service quyết định.
const parseItems = (body) => {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "Request body must be a JSON object");
    }
    const { items } = body;
    if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, "items must be a non-empty array");
    if (items.length > MAX_ITEMS) throw new HttpError(400, `items must not exceed ${MAX_ITEMS} entries`);
    return items.map((item) => {
        if (item === null || typeof item !== "object" || Array.isArray(item)) {
            throw new HttpError(400, "each item must be an object { pid, qty }");
        }
        const { pid, qty } = item;
        if (!Number.isInteger(pid) || pid < 1 || pid > MAX_INT32) throw new HttpError(400, "pid must be a positive integer");
        if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
            throw new HttpError(400, `qty must be an integer between 1 and ${MAX_QTY}`);
        }
        return { pid, qty };
    });
};

// Tên trường của REST theo đặc tả (snake_case: unit_price, total_amount).
const toItems = (items) => items.map((i) => ({ pid: i.pid, qty: i.qty, unit_price: i.unitPrice }));

const orderRoutes = ({ orderClient, shipmentClient, authenticateMw }) => {
    const router = express.Router();
    router.use(authenticateMw);

    // API-ORD-01. uid lấy từ JWT, KHÔNG nhận từ body (không cho đặt hàng thay người khác).
    router.post("/", authorize("CUSTOMER"), async (req, res) => {
        const items = parseItems(req.body);
        const order = await orderClient.createOrder({ uid: req.user.uid, items }, req.id);
        res.status(201).json({
            oid: order.oid,
            uid: order.uid,
            discount: order.discount,
            total_amount: order.totalAmount,
            items: toItems(order.items)
        });
    });

    // API-ORD-02: CUSTOMER thấy đơn của mình; ADMIN thấy tất cả (uid 0 = tất cả).
    router.get("/", authorize("CUSTOMER", "ADMIN"), async (req, res) => {
        const uid = req.user.role === "ADMIN" ? 0 : req.user.uid;
        const { items } = await orderClient.listOrders({ uid }, req.id);
        res.json({ items: items.map((o) => ({ oid: o.oid, uid: o.uid, discount: o.discount })) });
    });

    // API-ORD-03: 404 nếu không có; 403 nếu CUSTOMER xem đơn của người khác (UC10).
        // API-ORD-03: 404 nếu không có; 403 nếu CUSTOMER xem đơn của người khác (UC10).
    router.get("/:oid", authorize("CUSTOMER", "ADMIN"), async (req, res) => {
        const oid = parseOid(req.params.oid);
        const order = await orderClient.getOrder({ oid }, req.id);
        if (req.user.role !== "ADMIN" && order.uid !== req.user.uid) throw new HttpError(403, "Forbidden");

        // Shipment được tạo BẤT ĐỒNG BỘ từ OrderCreated (qua Kafka) nên có thể chưa có ngay sau khi đặt hàng: khi đó shipment = null.
        // Khi đã có, trả { shipid, status } để khách biết shipid mà tra GET /api/shipments/:shipid (UC12).
        let shipment = null;
        try {
            const s = await shipmentClient.getShipmentByOrder({ oid }, req.id);
            shipment = { shipid: s.shipid, status: s.status };
        } catch (error) {
            if (error.code !== grpc.status.NOT_FOUND) throw error;
        }
        res.json({
            oid: order.oid,
            uid: order.uid,
            discount: order.discount,
            total_amount: order.totalAmount,
            items: toItems(order.items),
            shipment
        });
    });

    return router;
};

module.exports = { orderRoutes };