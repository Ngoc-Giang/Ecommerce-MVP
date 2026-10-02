const { invalidArgument } = require("./errors");

const MAX_INT32 = 2147483647;

// Các trạng thái theo đặc tả API-SHP-02.
const STATUSES = ["PENDING", "SHIPPING", "DELIVERED", "CANCELLED"];

const isPositiveInt = (v) => Number.isInteger(v) && v >= 1 && v <= MAX_INT32;

const validateShipid = (shipid) => {
    if (!isPositiveInt(shipid)) throw invalidArgument("shipid must be a positive integer");
};

const validateOid = (oid) => {
    if (!isPositiveInt(oid)) throw invalidArgument("oid must be a positive integer");
};

const validateStatus = (status) => {
    if (!STATUSES.includes(status)) throw invalidArgument(`status must be one of ${STATUSES.join(", ")}`);
};

// Sự kiện OrderCreated hợp lệ phải có oid (TC-SHP-02) và uid (để sau này kiểm tra quyền xem shipment).
const validateOrderCreatedEvent = (event) => {
    if (event === null || typeof event !== "object" || Array.isArray(event)) throw invalidArgument("event must be an object");
    if (!isPositiveInt(event.oid)) throw invalidArgument("event is missing a valid oid");
    if (!isPositiveInt(event.uid)) throw invalidArgument("event is missing a valid uid");
};

module.exports = { STATUSES, validateShipid, validateOid, validateStatus, validateOrderCreatedEvent };