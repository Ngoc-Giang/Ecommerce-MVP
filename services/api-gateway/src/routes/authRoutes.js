const express = require("express");

const text = (value) => (value === undefined || value === null ? "" : String(value));

const authRoutes = ({ authClient, authLimiter }) => {
    const router = express.Router();

    router.post("/register", authLimiter, async (req, res) => {
        const body = req.body ?? {};
        const { uid } = await authClient.register(
            { username: text(body.username), password: text(body.password), email: text(body.email), phone: text(body.phone) },
            req.id
        );
        res.status(201).json({ message: "User registered successfully", uid });
    });

    router.post("/login", authLimiter, async (req, res) => {
        const body = req.body ?? {};
        const { accessToken, expiresIn } = await authClient.login(
            { username: text(body.username), password: text(body.password) },
            req.id
        );
        res.status(200).json({ accessToken, tokenType: "Bearer", expiresIn });
    });

    return router;
};

module.exports = { authRoutes };