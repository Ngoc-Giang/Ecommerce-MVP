const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || "customer_db",
    user: process.env.DB_USER || "customer_user",
    password: process.env.DB_PASSWORD || "customer_password"
});

pool.on("connect", () => {
    console.log("Connected to PostgreSQL");
});

module.exports = pool;