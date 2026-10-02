const { Kafka, Partitioners, logLevel } = require("kafkajs");

// Bọc kafkajs. Kết nối "lười": Auth vẫn khởi động và đăng ký vẫn chạy khi Kafka chưa sẵn sàng;
// relay sẽ thử lại cho tới khi gửi được.
class KafkaEventPublisher {
    constructor({ brokers, clientId, topics }) {
        this.topics = topics;
        this.kafka = new Kafka({
            clientId,
            brokers,
            logLevel: logLevel.WARN,
            connectionTimeout: 3000,
            retry: { retries: 2 }
        });
        this.producer = this.kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
        this.connected = false;
    }

    async connect() {
        // Tạo topic tường minh (idempotent) để không phụ thuộc cấu hình auto-create của broker.
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            await admin.createTopics({
                waitForLeaders: true,
                topics: this.topics.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 }))
            });
        } finally {
            await admin.disconnect().catch(() => {});
        }
        await this.producer.connect();
        this.connected = true;
    }

    async publish({ topic, key, value, headers }) {
        try {
            if (!this.connected) await this.connect();
            await this.producer.send({ topic, acks: -1, messages: [{ key, value, headers }] });
        } catch (error) {
            this.connected = false;
            await this.producer.disconnect().catch(() => {});
            throw error;
        }
    }

    async close() {
        await this.producer.disconnect().catch(() => {});
        this.connected = false;
    }
}

module.exports = { KafkaEventPublisher };