// Collection "shipments": { _id: shipid (số nguyên), oid, uid, status, createdAt, updatedAt }
//   Chỉ mục UNIQUE trên oid: mỗi đơn hàng có đúng một shipment => nhận trùng sự kiện không thể tạo trùng, kể cả khi hai tiến trình xử lý cùng lúc.
// Collection "counters": { _id: "shipments", seq } - bộ đếm cấp shipid dạng số nguyên (đặc tả API dùng shipid: 5001...).
const toShipment = (doc) => ({ shipid: doc._id, oid: doc.oid, uid: doc.uid, status: doc.status });

const DUPLICATE_KEY = 11000;

class MongoShipmentRepository {
    constructor(db) {
        this.shipments = db.collection("shipments");
        this.counters = db.collection("counters");
    }

    // Gọi một lần khi khởi động (idempotent).
    async init() {
        await this.shipments.createIndex({ oid: 1 }, { unique: true });
    }

    async nextShipid() {
        const counter = await this.counters.findOneAndUpdate(
            { _id: "shipments" },
            { $inc: { seq: 1 } },
            { upsert: true, returnDocument: "after" }
        );
        return counter.seq;
    }

    async createIfAbsent({ oid, uid }) {
        const existing = await this.shipments.findOne({ oid });
        if (existing) return { shipment: toShipment(existing), created: false };

        const shipid = await this.nextShipid();
        const now = new Date();
        try {
            await this.shipments.insertOne({ _id: shipid, oid, uid, status: "PENDING", createdAt: now, updatedAt: now });
        } catch (error) {
            // Hai bên cùng chèn một oid: chỉ một bên thắng nhờ chỉ mục unique, bên còn lại đọc lại bản đã có.
            if (error.code !== DUPLICATE_KEY) throw error;
            return { shipment: toShipment(await this.shipments.findOne({ oid })), created: false };
        }
        return { shipment: { shipid, oid, uid, status: "PENDING" }, created: true };
    }

    async findByShipid(shipid) {
        const doc = await this.shipments.findOne({ _id: shipid });
        return doc ? toShipment(doc) : null;
    }

    async findByOid(oid) {
        const doc = await this.shipments.findOne({ oid });
        return doc ? toShipment(doc) : null;
    }

    // Đổi trạng thái nguyên tử; trả về shipment sau khi đổi, hoặc null nếu không có.
    async updateStatus(shipid, status) {
        const doc = await this.shipments.findOneAndUpdate(
            { _id: shipid },
            { $set: { status, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        return doc ? toShipment(doc) : null;
    }
}

module.exports = { MongoShipmentRepository };