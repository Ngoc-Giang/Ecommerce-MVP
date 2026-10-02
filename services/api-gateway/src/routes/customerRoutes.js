const express = require("express");
const { HttpError } = require("../grpc/errorMapping");

const MAX_INT32 = 2147483647;

// Chỉ nhận số nguyên dương dạng chữ số thuần ("1abc", "0", "-1", "1.5" đều bị từ chối).
const parseUid = (value) => {
    if (!/^[1-9]\d{0,9}$/.test(value) || Number(value) > MAX_INT32) {
        throw new HttpError(400, "uid must be a positive integer");
    }
    return Number(value);
};

// CUSTOMER chỉ được đụng vào hồ sơ của chính mình; ADMIN được đụng vào mọi hồ sơ.
// Kiểm tra TRƯỚC khi hỏi Customer Service để người ngoài không dò được uid nào tồn tại.
const requireOwnerOrAdmin = (user, uid) => {
    if (user.role !== "ADMIN" && user.uid !== uid) throw new HttpError(403, "Forbidden");
};

const customerRoutes = ({ customerClient, authenticateMw }) => {
    const router = express.Router();
    router.use(authenticateMw);

    // API-CUS-01 (kèm membership để đáp ứng TC-CUS-04: trả mname và score)
    router.get("/:uid", async (req, res) => {
        const uid = parseUid(req.params.uid);
        requireOwnerOrAdmin(req.user, uid);
        const customer = await customerClient.getCustomer({ uid }, req.id);
        res.json({
            uid: customer.uid,
            fullname: customer.fullname,
            mid: customer.mid,
            membership: { mname: customer.membership.mname, score: customer.membership.score }
        });
    });

    // API-CUS-02
    router.put("/:uid", async (req, res) => {
        const uid = parseUid(req.params.uid);
        requireOwnerOrAdmin(req.user, uid);

        const body = req.body;
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
            throw new HttpError(400, "Request body must be a JSON object");
        }
        const { fullname, mid } = body;
        if (fullname !== undefined && (typeof fullname !== "string" || fullname.trim() === "")) {
            throw new HttpError(400, "fullname must be a non-empty string");
        }
        if (mid !== undefined) {
            if (!Number.isInteger(mid) || mid < 1) throw new HttpError(400, "mid must be a positive integer");
            // Hạng thành viên ảnh hưởng giảm giá nên chỉ ADMIN được đổi.
            if (req.user.role !== "ADMIN") throw new HttpError(403, "Only admin can change membership");
        }
        if (fullname === undefined && mid === undefined) throw new HttpError(400, "Nothing to update");

        // proto3: fullname "" và mid 0 nghĩa là "không đổi".
        await customerClient.updateCustomer({ uid, fullname: fullname ?? "", mid: mid ?? 0 }, req.id);
        res.json({ message: "Customer updated successfully", uid });
    });

    return router;
};

module.exports = { customerRoutes };