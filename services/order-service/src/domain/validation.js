const { invalidArgument } = require("./errors");

const MAX_INT32 = 2147483647;
const MAX_QTY = 1000000;
const MAX_ITEMS = 50;

const isPositiveInt = (v) => Number.isInteger(v) && v >= 1 && v <= MAX_INT32;

const validateUid = (uid) => {
    if (!isPositiveInt(uid)) throw invalidArgument("uid must be a positive integer");
};

const validateOid = (oid) => {
    if (!isPositiveInt(oid)) throw invalidArgument("oid must be a positive integer");
};

// items: [{ pid, qty }]. Không cho trùng pid (gộp số lượng là việc của client).
const validateItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) throw invalidArgument("items must be a non-empty array");
    if (items.length > MAX_ITEMS) throw invalidArgument(`items must not exceed ${MAX_ITEMS} entries`);
    const seen = new Set();
    for (const item of items) {
        if (!isPositiveInt(item.pid)) throw invalidArgument("pid must be a positive integer");
        if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_QTY) {
            throw invalidArgument(`qty must be an integer between 1 and ${MAX_QTY}`);
        }
        if (seen.has(item.pid)) throw invalidArgument(`Duplicate pid ${item.pid}`);
        seen.add(item.pid);
    }
};

module.exports = { validateUid, validateOid, validateItems };