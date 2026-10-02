const express = require("express");
const { HttpError } = require("../grpc/errorMapping");
const { authorize } = require("../middleware/authorize");

const MAX_INT32 = 2147483647;
const MAX_QUANTITY = 1000000000; // trùng giới hạn của Product Service; chặn sớm vì int32 của proto sẽ "quấn vòng" nếu số quá lớn

// Chỉ nhận số nguyên dương dạng chữ số thuần.
const parsePid = (value) => {
    if (!/^[1-9]\d{0,9}$/.test(value) || Number(value) > MAX_INT32) {
        throw new HttpError(400, "pid must be a positive integer");
    }
    return Number(value);
};

// PUT thay thế toàn bộ, POST tạo mới: cả ba trường đều bắt buộc.
// Gateway phải tự kiểm tra "có mặt và đúng kiểu" vì proto3 biến trường thiếu thành "" hoặc 0, Product Service không phân biệt được.
// Giới hạn nghiệp vụ chi tiết (độ dài tên, tối đa 2 số lẻ...) do Product Service quyết định.
const parseProductBody = (body) => {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "Request body must be a JSON object");
    }
    const { pname, price, quantity } = body;
    if (typeof pname !== "string" || pname.trim() === "") throw new HttpError(400, "pname must be a non-empty string");
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) throw new HttpError(400, "price must be a non-negative number");
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
        throw new HttpError(400, `quantity must be an integer between 0 and ${MAX_QUANTITY}`);
    }
    return { pname, price, quantity };
};

const toProduct = (p) => ({ pid: p.pid, pname: p.pname, price: p.price, quantity: p.quantity });

const productRoutes = ({ productClient, authenticateMw }) => {
    const router = express.Router();
    router.use(authenticateMw);
    const adminOnly = authorize("ADMIN");

    // Mọi người dùng đã đăng nhập đều xem được
    router.get("/", async (req, res) => {
        const { items } = await productClient.listProducts({}, req.id);
        res.json({ items: items.map(toProduct) });
    });

    router.get("/:pid", async (req, res) => {
        const pid = parsePid(req.params.pid);
        res.json(toProduct(await productClient.getProduct({ pid }, req.id)));
    });

    // Ghi dữ liệu: chỉ ADMIN. Thứ tự: quyền (403) -> pid (400) -> body (400) -> gọi service.
    router.post("/", adminOnly, async (req, res) => {
        const data = parseProductBody(req.body);
        const product = await productClient.createProduct(data, req.id);
        res.status(201).json(toProduct(product));
    });

    router.put("/:pid", adminOnly, async (req, res) => {
        const pid = parsePid(req.params.pid);
        const data = parseProductBody(req.body);
        await productClient.updateProduct({ pid, ...data }, req.id);
        res.json({ message: "Product updated successfully", pid });
    });

    router.delete("/:pid", adminOnly, async (req, res) => {
        const pid = parsePid(req.params.pid);
        await productClient.deleteProduct({ pid }, req.id);
        res.json({ message: "Product deleted successfully", pid });
    });

    return router;
};

module.exports = { productRoutes };