const authService = require("../services/authService");

const register = async (req, res) => {
    try {
        const { username, password, fullname, roleid } = req.body;

        const user = await authService.register(
            username,
            password,
            fullname,
            roleid
        );

        return res.status(201).json({
            message: "User registered successfully",
            user
        });
    } catch (error) {
        if (error.message === "USERNAME_ALREADY_EXISTS") {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        console.error("Register error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const result = await authService.login(
            username,
            password
        );

        return res.status(200).json({
            message: "Login successful",
            token: result.token
        });
    } catch (error) {
        if (error.message === "INVALID_CREDENTIALS") {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        console.error("Login error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    register,
    login
};