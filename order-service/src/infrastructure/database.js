const { Pool } = require("pg");

const createPool = (env = process.env) => {
    const pool = new Pool({
        host: env.DB_HOST,
        port: Number(env.DB_PORT),
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD
    });
    // BẮT BUỘC: nếu thiếu handler này, DB restart/ngắt kết nối sẽ làm sập cả tiến trình.
    pool.on("error", (error) => console.error("PostgreSQL pool error:", error.message));
    return pool;
};

module.exports = { createPool };