const { invalidArgument } = require("./errors");

const validateUid = (uid) => {
    if (!Number.isInteger(uid) || uid < 1) throw invalidArgument("uid must be a positive integer");
    return uid;
};

const validateFullname = (fullname) => {
    const value = typeof fullname === "string" ? fullname.trim() : "";
    if (value.length < 1 || value.length > 100) throw invalidArgument("fullname must be 1-100 characters");
    return value;
};

const validateMid = (mid) => {
    if (!Number.isInteger(mid) || mid < 1) throw invalidArgument("mid must be a positive integer");
    return mid;
};

module.exports = { validateUid, validateFullname, validateMid };