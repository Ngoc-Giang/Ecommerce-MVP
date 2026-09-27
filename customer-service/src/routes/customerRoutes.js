const express = require("express");

const {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
} = require("../controllers/customerController");

const router = express.Router();

router.post("/", createCustomer);

router.get("/", getAllCustomers);

router.get("/:id", getCustomerById);

router.put("/:id", updateCustomer);

router.delete("/:id", deleteCustomer);

module.exports = router;