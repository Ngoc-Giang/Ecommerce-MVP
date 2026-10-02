// Đọc các dòng PENDING trong outbox_events, gửi ra broker, rồi đánh dấu PUBLISHED.
// Giao hàng "ít nhất một lần": nếu sập giữa lúc gửi và đánh dấu, sự kiện có thể được gửi lại
// => consumer PHẢI xử lý idempotent (dùng eventId / khoá chính).
class OutboxRelay {
    constructor({ pool, publisher, topicFor, batchSize = 50, intervalMs = 1000, retryMs = 5000, logger = console }) {
        Object.assign(this, { pool, publisher, topicFor, batchSize, intervalMs, retryMs, logger });
        this.running = false;
        this.loopPromise = null;
        this.wake = null;
    }

    // Xử lý một lô; trả về số sự kiện đã gửi. Ném lỗi nếu gửi thất bại (các dòng đã gửi trước đó vẫn được ghi nhận).
    async tick() {
        const client = await this.pool.connect();
        let published = 0;
        let failure = null;
        try {
            await client.query("BEGIN");
            // SKIP LOCKED: nhiều relay chạy song song sẽ không giành cùng một dòng.
            const { rows } = await client.query(
                `SELECT id, event_type, payload FROM outbox_events
                  WHERE status = 'PENDING' ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`,
                [this.batchSize]
            );
            for (const row of rows) {
                try {
                    await this.publisher.publish({
                        topic: this.topicFor(row.event_type),
                        key: String(row.payload.uid),
                        value: JSON.stringify(row.payload),
                        headers: { eventType: row.event_type }
                    });
                } catch (error) {
                    failure = error;
                    break; // giữ đúng thứ tự: không gửi tiếp các sự kiện sau sự kiện lỗi
                }
                await client.query(`UPDATE outbox_events SET status = 'PUBLISHED', published_at = now() WHERE id = $1`, [row.id]);
                published += 1;
            }
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK").catch(() => {});
            throw error;
        } finally {
            client.release();
        }
        if (failure) throw failure;
        return published;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.loopPromise = this.loop();
    }

    async loop() {
        while (this.running) {
            let delay = this.intervalMs;
            try {
                const published = await this.tick();
                if (published >= this.batchSize) delay = 0; // còn nhiều: xử lý tiếp ngay
            } catch (error) {
                this.logger.error(`Outbox relay error: ${error.message}`);
                delay = this.retryMs;
            }
            if (delay > 0 && this.running) await this.sleep(delay);
        }
    }

    sleep(ms) {
        return new Promise((resolve) => {
            const timer = setTimeout(resolve, ms);
            this.wake = () => { clearTimeout(timer); resolve(); };
        });
    }

    async stop() {
        this.running = false;
        if (this.wake) this.wake();
        await this.loopPromise;
    }
}

module.exports = { OutboxRelay };