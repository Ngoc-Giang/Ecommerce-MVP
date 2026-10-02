// Bảng theo ERD: orders(oid, uid, discount), order_details(oid, pid, qty, unit_price) + outbox_events.
// NUMERIC của pg trả về chuỗi => đổi sang Number ở đây để phần còn lại của code chỉ thấy số.
class PgOrderRepository {
    constructor(pool) {
        this.pool = pool;
    }

    // UC09: một transaction duy nhất cho Order + OrderDetail + OutboxEvent. Lỗi bất kỳ => ROLLBACK toàn bộ.
    async create({ uid, discount, items }, buildEvent) {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const { rows } = await client.query(
                "INSERT INTO orders (uid, discount) VALUES ($1, $2) RETURNING oid",
                [uid, discount]
            );
            const oid = rows[0].oid;
            await client.query(
                `INSERT INTO order_details (oid, pid, qty, unit_price)
                 SELECT $1, pid, qty, unit_price
                   FROM unnest($2::int[], $3::int[], $4::numeric[]) AS t(pid, qty, unit_price)`,
                [oid, items.map((i) => i.pid), items.map((i) => i.qty), items.map((i) => i.unitPrice)]
            );
            const event = buildEvent(oid);
            await client.query("INSERT INTO outbox_events (event_type, payload) VALUES ($1, $2)", [
                event.type,
                JSON.stringify(event.payload)
            ]);
            await client.query("COMMIT");
            return oid;
        } catch (error) {
            await client.query("ROLLBACK").catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    }

    async findByOid(oid) {
        const order = await this.pool.query("SELECT oid, uid, discount FROM orders WHERE oid = $1", [oid]);
        if (order.rows.length === 0) return null;
        const details = await this.pool.query(
            "SELECT pid, qty, unit_price FROM order_details WHERE oid = $1 ORDER BY pid",
            [oid]
        );
        const { uid, discount } = order.rows[0];
        return {
            oid,
            uid,
            discount: Number(discount),
            items: details.rows.map((r) => ({ pid: r.pid, qty: r.qty, unitPrice: Number(r.unit_price) }))
        };
    }

    async list({ uid }) {
        const { rows } = uid
            ? await this.pool.query("SELECT oid, uid, discount FROM orders WHERE uid = $1 ORDER BY oid", [uid])
            : await this.pool.query("SELECT oid, uid, discount FROM orders ORDER BY oid");
        return rows.map((r) => ({ oid: r.oid, uid: r.uid, discount: Number(r.discount) }));
    }
}

module.exports = { PgOrderRepository };