const { HttpError } = require("../grpc/errorMapping");

// Dùng SAU authenticate:  authorize("ADMIN", "SHIPMENT_STAFF")
const authorize = (...allowedRoles) => (req, _res, next) => {
    if (!req.user) throw new HttpError(401, "Unauthorized");
    if (!allowedRoles.includes(req.user.role)) throw new HttpError(403, "Forbidden");
    next();
};

module.exports = { authorize };