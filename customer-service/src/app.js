require("dotenv").config();

const express = require("express");

const customerRoutes = require("./routes/customerRoutes");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    return res.status(200).json({
        service: "customer-service",
        status: "UP"
    });
});

app.use("/customers", customerRoutes);

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Customer Service running on port ${PORT}`);
});