const { validateRegistration } = require("../domain/validation");
const { ROLES } = require("../domain/roles");
const { userRegistered } = require("../domain/events");

class RegisterUser {
    constructor({ userRepository, passwordHasher }) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
    }

    async execute(input) {
        const data = validateRegistration(input);
        const passwordHash = await this.passwordHasher.hash(data.password);

        // Role luôn là CUSTOMER, bất kể client gửi gì. Trùng username/email:
        // repository ném ALREADY_EXISTS (dựa vào ràng buộc UNIQUE của DB, an toàn khi đăng ký song song).
        // Sự kiện UserRegistered được ghi cùng transaction với User (Outbox) để không bao giờ mất sự kiện.
        const user = await this.userRepository.create(
            {
                username: data.username,
                email: data.email,
                phone: data.phone,
                passwordHash,
                role: ROLES.CUSTOMER
            },
            (uid) => userRegistered({ uid, username: data.username })
        );
        return { uid: user.uid };
    }
}

module.exports = { RegisterUser };