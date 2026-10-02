// Collection "products": { _id: pid (số nguyên), pname, price, quantity, createdAt, updatedAt }
// Collection "counters": { _id: "products", seq } - bộ đếm để cấp pid dạng số nguyên (đặc tả API dùng pid: 1, 2, 3...).
const toProduct = (doc) => ({ pid: doc._id, pname: doc.pname, price: doc.price, quantity: doc.quantity });

class MongoProductRepository {
    constructor(db) {
        this.products = db.collection("products");
        this.counters = db.collection("counters");
    }

    async nextPid() {
        const counter = await this.counters.findOneAndUpdate(
            { _id: "products" },
            { $inc: { seq: 1 } },
            { upsert: true, returnDocument: "after" }
        );
        return counter.seq;
    }

    async create({ pname, price, quantity }) {
        const pid = await this.nextPid();
        const now = new Date();
        await this.products.insertOne({ _id: pid, pname, price, quantity, createdAt: now, updatedAt: now });
        return { pid, pname, price, quantity };
    }

    async list() {
        const docs = await this.products.find({}).sort({ _id: 1 }).limit(1000).toArray();
        return docs.map(toProduct);
    }

    async findByPid(pid) {
        const doc = await this.products.findOne({ _id: pid });
        return doc ? toProduct(doc) : null;
    }

    async replace(pid, { pname, price, quantity }) {
        const result = await this.products.updateOne({ _id: pid }, { $set: { pname, price, quantity, updatedAt: new Date() } });
        return result.matchedCount > 0;
    }

    async remove(pid) {
        const result = await this.products.deleteOne({ _id: pid });
        return result.deletedCount > 0;
    }

    // Trừ kho NGUYÊN TỬ có điều kiện: chỉ trừ khi còn đủ hàng. Trả về sản phẩm TRƯỚC khi trừ (lấy giá), hoặc null.
    async reserve(pid, qty) {
        const before = await this.products.findOneAndUpdate(
            { _id: pid, quantity: { $gte: qty } },
            { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
            { returnDocument: "before" }
        );
        return before ? toProduct(before) : null;
    }

    async release(pid, qty) {
        await this.products.updateOne({ _id: pid }, { $inc: { quantity: qty }, $set: { updatedAt: new Date() } });
    }
}

module.exports = { MongoProductRepository };