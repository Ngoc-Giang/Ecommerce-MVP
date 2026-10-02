const { Kafka, logLevel } = require("kafkajs");

// Chạy một consumer kafkajs. Kết nối "lười" có thử lại: service vẫn khởi động (gRPC, health) khi Kafka chưa sẵn sàng.
class KafkaConsumerRunner {
    constructor({ brokers, clientId, groupId, topic, onMessage, retryMs = 5000, logger = console }) {
        Object.assign(this, { groupId, topic, onMessage, retryMs, logger });
        this.kafka = new Kafka({ clientId, brokers, logLevel: logLevel.WARN, connectionTimeout: 3000, retry: { retries: 2 } });
        this.running = false;
        this.loopPromise = null;
        this.consumer = null;
    }

    start() {
        this.running = true;
        this.loopPromise = this.connectLoop();
    }

    async connectLoop() {
        while (this.running) {
            try {
                // Mỗi lần thử dùng consumer mới để không dính trạng thái hỏng của lần trước.
                this.consumer = this.kafka.consumer({
                    groupId: this.groupId,
                    retry: { retries: 10, initialRetryTime: 1000, maxRetryTime: 30000 }
                });
                this.consumer.on(this.consumer.events.CRASH, (event) =>
                    this.logger.error(`Kafka consumer crashed: ${event.payload.error.message}`)
                );
                await this.consumer.connect();
                await this.consumer.subscribe({ topic: this.topic, fromBeginning: true });
                await this.consumer.run({ eachMessage: async ({ message }) => this.onMessage(message) });
                this.logger.log(`Kafka consumer running (group ${this.groupId}, topic ${this.topic})`);
                return;
            } catch (error) {
                this.logger.error(`Kafka consumer start failed: ${error.message}`);
                await this.consumer.disconnect().catch(() => {});
                await new Promise((resolve) => setTimeout(resolve, this.retryMs));
            }
        }
    }

    async stop() {
        this.running = false;
        await this.loopPromise;
        if (this.consumer) await this.consumer.disconnect().catch(() => {});
    }
}

module.exports = { KafkaConsumerRunner };