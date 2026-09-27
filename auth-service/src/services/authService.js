const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

const register = async (username, password, fullname, roleid) => {
    const existingUser = await userRepository.findUserByUsername(username);

    if (existingUser) {
        throw new Error("USERNAME_ALREADY_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.createUser(
        username,
        hashedPassword,
        fullname,
        roleid
    );

    return user;
};

const login = async (username, password) => {
    const user = await userRepository.findUserByUsername(username);

    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const isPasswordValid = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordValid) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const token = jwt.sign(
        {
            uid: user.uid,
            username: user.username,
            roleid: user.roleid
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );

    return {
        token
    };
};

module.exports = {
    register,
    login
};