const ROLES = Object.freeze({
    ADMIN: "ADMIN",
    CUSTOMER: "CUSTOMER",
    SHIPMENT_STAFF: "SHIPMENT_STAFF"
});

const isValidRole = (role) => Object.values(ROLES).includes(role);

module.exports = { ROLES, isValidRole };