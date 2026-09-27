require("dotenv").config();

const express = require("express");
const pool = require("./config/database");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/auth", authRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        service: "auth-service",
        status: "UP"
    });
});

app.get("/health/db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.status(200).json({
            service: "auth-service",
            database: "UP",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            service: "auth-service",
            database: "DOWN"
        });
    }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});