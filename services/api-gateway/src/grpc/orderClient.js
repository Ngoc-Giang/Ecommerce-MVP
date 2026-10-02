const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Cùng vị trí tương đối trong repo và container: <gốc>/proto/order.proto
const PROTO_PATH = path.join(__dirname, "../../../proto/order.proto");

const loadProto = () =>
    grpc.loadPackageDefinition(
        protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: Number, defaults: true })
    ).order;

class OrderClient {
    constructor({ url, timeoutMs }) {
        this.timeoutMs = timeoutMs;
        this.client = new (loadProto().OrderService)(url, grpc.credentials.createInsecure());
    }

    call(method, request, requestId) {
        return new Promise((resolve, reject) => {
            const metadata = new grpc.Metadata();
            if (requestId) metadata.set("x-request-id", String(requestId));
            this.client[method](request, metadata, { deadline: Date.now() + this.timeoutMs }, (error, response) =>
                error ? reject(error) : resolve(response)
            );
        });
    }

    createOrder(request, requestId) { return this.call("CreateOrder", request, requestId); }
    getOrder(request, requestId) { return this.call("GetOrder", request, requestId); }
    listOrders(request, requestId) { return this.call("ListOrders", request, requestId); }

    isReady(timeoutMs = 1000) {
        return new Promise((resolve) =>
            this.client.waitForReady(Date.now() + timeoutMs, (error) => resolve(!error))
        );
    }

    close() { this.client.close(); }
}

module.exports = { OrderClient };