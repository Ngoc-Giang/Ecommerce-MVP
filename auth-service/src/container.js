const { RegisterUser } = require("./application/registerUser");
const { LoginUser } = require("./application/loginUser");
const { VerifyToken } = require("./application/verifyToken");
const { PgUserRepository } = require("./infrastructure/pgUserRepository");
const { BcryptPasswordHasher } = require("./infrastructure/bcryptPasswordHasher");
const { JwtTokenService } = require("./infrastructure/jwtTokenService");

const buildContainer = ({ pool, jwtSecret, jwtExpiresInSeconds }) => {
    const userRepository = new PgUserRepository(pool);
    const passwordHasher = new BcryptPasswordHasher();
    const tokenService = new JwtTokenService({ secret: jwtSecret, expiresInSeconds: jwtExpiresInSeconds });
    return {
        userRepository,
        passwordHasher,
        registerUser: new RegisterUser({ userRepository, passwordHasher }),
        loginUser: new LoginUser({ userRepository, passwordHasher, tokenService }),
        verifyToken: new VerifyToken({ tokenService })
    };
};

module.exports = { buildContainer };