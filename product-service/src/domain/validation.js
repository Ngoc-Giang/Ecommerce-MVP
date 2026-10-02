const { invalidArgument } = require("./errors");

const MAX_INT32 = 2147483647;
const MAX_PRICE = 1000000000;
const MAX_STOCK = 1000000000;
const MAX_ORDER_QTY = 1000000;
const MAX_ITEMS = 50;

const validatePid = (pid) => {
    if (!Number.isInteger(pid) || pid < 1 || pid > MAX_INT32) throw invalidArgument("pid must be a positive integer");
    return pid;
};

// Dữ liệu sản phẩm đầy đủ: dùng cho tạo mới và cho PUT (thay thế toàn bộ).
const validateProductData = ({ pname, price, quantity }) => {
    const name = typeof pname === "string" ? pname.trim() : "";
    if (name.length < 1 || name.length > 200) throw invalidArgument("pname must be 1-200 characters");
    if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) throw invalidArgument("price must be a number between 0 and 1000000000");
    if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) throw invalidArgument("price must have at most 2 decimal places");
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_STOCK) throw invalidArgument("quantity must be an integer >= 0");
    return { pname: name, price, quantity };
};

// Danh sách (pid, qty) cho đặt/hoàn tồn kho: không rỗng, không trùng pid, qty nguyên dương.
const validateStockItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) throw invalidArgument("items must not be empty");
    if (items.length > MAX_ITEMS) throw invalidArgument(`items must have at most ${MAX_ITEMS} entries`);
    const seen = new Set();
    return items.map((item) => {
        const pid = validatePid(item?.pid);
        if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_ORDER_QTY) {
            throw invalidArgument("qty must be an integer between 1 and 1000000");
        }
        if (seen.has(pid)) throw invalidArgument(`duplicate pid ${pid} in items`);
        seen.add(pid);
        return { pid, qty: item.qty };
    });
};

module.exports = { validatePid, validateProductData, validateStockItems };