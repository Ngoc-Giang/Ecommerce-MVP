const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!allowedRoles.includes(req.user.roleid)) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        next();
    };
};

module.exports = authorizeRole;