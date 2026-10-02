const { MongoClient } = require("mongodb");

// Kết nối MongoDB; tên database lấy từ chuỗi kết nối (…/product_db?authSource=admin).
const connectMongo = async (uri) => {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 }); // fail fast nếu chưa sẵn sàng
    return { client, db };
};

module.exports = { connectMongo };