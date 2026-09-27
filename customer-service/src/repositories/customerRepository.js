const pool = require("../config/database");

const createCustomer = async (fullname, phone, email) => {
    const result = await pool.query(
        `
        INSERT INTO customers (fullname, phone, email)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [fullname, phone, email || null]
    );

    return result.rows[0];
};

const getAllCustomers = async () => {
    const result = await pool.query(
        `
        SELECT *
        FROM customers
        ORDER BY id ASC
        `
    );

    return result.rows;
};

const getCustomerById = async (id) => {
    const result = await pool.query(
        `
        SELECT *
        FROM customers
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];
};

const updateCustomer = async (id, fullname, phone, email) => {
    const result = await pool.query(
        `
        UPDATE customers
        SET
            fullname = $1,
            phone = $2,
            email = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
        `,
        [fullname, phone, email || null, id]
    );

    return result.rows[0];
};

const deleteCustomer = async (id) => {
    const result = await pool.query(
        `
        DELETE FROM customers
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    return result.rows[0];
};

module.exports = {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
};