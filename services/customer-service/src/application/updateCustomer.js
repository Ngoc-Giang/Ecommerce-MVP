const { invalidArgument, notFound } = require("../domain/errors");
const { validateUid, validateFullname, validateMid } = require("../domain/validation");

// Quy ước gRPC (proto3 không phân biệt "không gửi" và "giá trị rỗng"): fullname = "" và mid = 0 nghĩa là không đổi.
class UpdateCustomer {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute({ uid, fullname, mid }) {
        const id = validateUid(uid);
        const changes = {};
        if (fullname !== "" && fullname !== undefined) changes.fullname = validateFullname(fullname);
        if (mid !== 0 && mid !== undefined) changes.mid = validateMid(mid);
        if (Object.keys(changes).length === 0) throw invalidArgument("Nothing to update");

        const updated = await this.customerRepository.update(id, changes);
        if (!updated) throw notFound("Customer not found");
        return { uid: id };
    }
}

module.exports = { UpdateCustomer };