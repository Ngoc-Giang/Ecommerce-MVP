const { invalidArgument } = require("../domain/errors");

const FOREIGN_KEY_VIOLATION = "23503";

class PgCustomerRepository {
    constructor(pool) {
        this.pool = pool;
    }

    async findByUid(uid) {
        const { rows } = await this.pool.query(
            `SELECT c.uid, c.fullname, c.mid, m.mname, m.score
               FROM customer c JOIN membership m ON m.mid = c.mid
              WHERE c.uid = $1`,
            [uid]
        );
        if (rows.length === 0) return null;
        const row = rows[0];
        return {
            uid: row.uid,
            fullname: row.fullname,
            mid: row.mid,
            membership: { mid: row.mid, mname: row.mname, score: row.score }
        };
    }

    // changes: { fullname?, mid? } — trả về true nếu có dòng được cập nhật.
    // Tạo Customer nếu chưa có. Trả về true nếu vừa tạo, false nếu đã tồn tại (không ghi đè).
    async createIfAbsent({ uid, fullname }) {
        const { rowCount } = await this.pool.query(
            `INSERT INTO customer (uid, fullname) VALUES ($1, $2) ON CONFLICT (uid) DO NOTHING`,
            [uid, fullname]
        );
        return rowCount > 0;
    }

    async update(uid, changes) {
        try {
            const { rowCount } = await this.pool.query(
                `UPDATE customer
                    SET fullname = COALESCE($2, fullname),
                        mid      = COALESCE($3, mid)
                  WHERE uid = $1`,
                [uid, changes.fullname ?? null, changes.mid ?? null]
            );
            return rowCount > 0;
        } catch (error) {
            if (error.code === FOREIGN_KEY_VIOLATION) throw invalidArgument("mid does not exist");
            throw error;
        }
    }
}

module.exports = { PgCustomerRepository };