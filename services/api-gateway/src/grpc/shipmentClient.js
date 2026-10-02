const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Cùng vị trí tương đối trong repo và container: <gốc>/proto/shipment.proto
const PROTO_PATH = path.join(__dirname, "../../../proto/shipment.proto");

const loadProto = () =>
    grpc.loadPackageDefinition(
        protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: Number, defaults: true })
    ).shipment;

class ShipmentClient {
    constructor({ url, timeoutMs }) {
        this.timeoutMs = timeoutMs;
        this.client = new (loadProto().ShipmentService)(url, grpc.credentials.createInsecure());
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

    getShipment(request, requestId) { return this.call("GetShipment", request, requestId); }
    getShipmentByOrder(request, requestId) { return this.call("GetShipmentByOrder", request, requestId); }
    updateShipmentStatus(request, requestId) { return this.call("UpdateShipmentStatus", request, requestId); }

    isReady(timeoutMs = 1000) {
        return new Promise((resolve) =>
            this.client.waitForReady(Date.now() + timeoutMs, (error) => resolve(!error))
        );
    }

    close() { this.client.close(); }
}

module.exports = { ShipmentClient };