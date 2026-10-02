const { invalidArgument } = require("./errors");

const USERNAME_RE = /^[a-z0-9_.]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{8,15}$/;

const validateRegistration = (input = {}) => {
    const username = String(input.username ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const email = String(input.email ?? "").trim().toLowerCase();
    const phone = String(input.phone ?? "").trim();

    if (!USERNAME_RE.test(username)) {
        throw invalidArgument("username must be 3-50 chars: letters, digits, '_' or '.'");
    }
    // bcrypt chỉ dùng 72 byte đầu, nên chặn mật khẩu dài hơn để tránh hiểu nhầm.
    if (password.length < 8 || Buffer.byteLength(password) > 72) {
        throw invalidArgument("password must be 8-72 bytes");
    }
    if (email.length > 100 || !EMAIL_RE.test(email)) {
        throw invalidArgument("email is invalid");
    }
    if (phone !== "" && !PHONE_RE.test(phone)) {
        throw invalidArgument("phone must be 8-15 digits");
    }
    return { username, password, email, phone: phone || null };
};

module.exports = { validateRegistration };