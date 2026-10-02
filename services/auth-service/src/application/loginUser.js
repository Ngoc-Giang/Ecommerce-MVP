const { invalidArgument, unauthenticated } = require("../domain/errors");

class LoginUser {
    constructor({ userRepository, passwordHasher, tokenService }) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.tokenService = tokenService;
        this.dummyHash = null;
    }

    async execute({ username, password } = {}) {
        const name = String(username ?? "").trim().toLowerCase();
        const pw = String(password ?? "");
        if (name === "" || pw === "") {
            throw invalidArgument("username and password are required");
        }

        const user = await this.userRepository.findByUsername(name);

        // Không có user vẫn so sánh với một hash giả để thời gian phản hồi gần như nhau
        // (chống dò tên đăng nhập), và luôn trả cùng một thông báo lỗi.
        if (!user && !this.dummyHash) {
            this.dummyHash = await this.passwordHasher.hash("timing-equalizer");
        }
        const ok = await this.passwordHasher.compare(pw, user ? user.passwordHash : this.dummyHash);
        if (!user || !ok) {
            throw unauthenticated("Invalid username or password");
        }

        return this.tokenService.issue({ uid: user.uid, role: user.role });
    }
}

module.exports = { LoginUser };