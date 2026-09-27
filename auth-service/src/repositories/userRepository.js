const pool = require("../config/database");

const findUserByUsername = async (username) => {
    const result = await pool.query(
        "SELECT uid, username, password, fullname, roleid FROM users WHERE username = $1",
        [username]
    );

    return result.rows[0] || null;
};

const createUser = async (username, password, fullname, roleid) => {
    const result = await pool.query(
        `INSERT INTO users (username, password, fullname, roleid)
         VALUES ($1, $2, $3, $4)
         RETURNING uid, username, fullname, roleid`,
        [username, password, fullname, roleid]
    );

    return result.rows[0];
};

module.exports = {
    findUserByUsername,
    createUser
};