const customerService = require("../services/customerService");

const createCustomer = async (req, res) => {
    try {
        const { fullname, phone, email } = req.body;

        if (!fullname || !phone) {
            return res.status(400).json({
                message: "fullname and phone are required"
            });
        }

        const customer = await customerService.createCustomer(
            fullname,
            phone,
            email
        );

        return res.status(201).json({
            message: "Customer created successfully",
            customer
        });
    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Phone or email already exists"
            });
        }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getAllCustomers = async (req, res) => {
    try {
        const customers = await customerService.getAllCustomers();

        return res.status(200).json({
            customers
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await customerService.getCustomerById(id);

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        return res.status(200).json({
            customer
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullname, phone, email } = req.body;

        if (!fullname || !phone) {
            return res.status(400).json({
                message: "fullname and phone are required"
            });
        }

        const customer = await customerService.updateCustomer(
            id,
            fullname,
            phone,
            email
        );

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        return res.status(200).json({
            message: "Customer updated successfully",
            customer
        });
    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Phone or email already exists"
            });
        }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await customerService.deleteCustomer(id);

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        return res.status(200).json({
            message: "Customer deleted successfully",
            customer
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
};