const { alreadyExists } = require("../domain/errors");

class PgUserRepository {
    constructor(pool) {
        this.pool = pool;
    }

    async findByUsername(username) {
        const { rows } = await this.pool.query(
            `SELECT u.uid, u.username, u.email, u.phone, u.password, r.rolename
               FROM users u JOIN roles r ON r.roleid = u.roleid
              WHERE u.username = $1`,
            [username]
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return { uid: r.uid, username: r.username, email: r.email, phone: r.phone, passwordHash: r.password, role: r.rolename };
    }

    // buildEvent (tuỳ chọn): (uid) => { type, payload }. Nếu có, sự kiện được ghi vào outbox_events
    // TRONG CÙNG transaction với User: hoặc cả hai cùng lưu, hoặc cả hai cùng không lưu.
    async create({ username, email, phone, passwordHash, role }, buildEvent) {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const { rows } = await client.query(
                `INSERT INTO users (username, email, phone, password, roleid)
                 VALUES ($1, $2, $3, $4, (SELECT roleid FROM roles WHERE rolename = $5))
                 RETURNING uid`,
                [username, email, phone, passwordHash, role]
            );
            const uid = rows[0].uid;
            if (buildEvent) {
                const event = buildEvent(uid);
                await client.query(`INSERT INTO outbox_events (event_type, payload) VALUES ($1, $2)`, [
                    event.type,
                    JSON.stringify(event.payload)
                ]);
            }
            await client.query("COMMIT");
            return { uid };
        } catch (error) {
            await client.query("ROLLBACK").catch(() => {});
            if (error.code === "23505") {
                throw alreadyExists("Username or email already exists");
            }
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = { PgUserRepository };