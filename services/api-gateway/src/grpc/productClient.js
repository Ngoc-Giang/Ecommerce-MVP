const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Cùng vị trí tương đối trong repo và container: <gốc>/proto/product.proto
const PROTO_PATH = path.join(__dirname, "../../../proto/product.proto");

const loadProto = () =>
    grpc.loadPackageDefinition(
        protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: Number, defaults: true })
    ).product;

// Gateway chỉ gọi nhóm "catalog". ReserveStock/ReleaseStock là việc của Order Service, không lộ ra REST.
class ProductClient {
    constructor({ url, timeoutMs }) {
        this.timeoutMs = timeoutMs;
        this.client = new (loadProto().ProductService)(url, grpc.credentials.createInsecure());
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

    listProducts(request, requestId) { return this.call("ListProducts", request, requestId); }
    getProduct(request, requestId) { return this.call("GetProduct", request, requestId); }
    createProduct(request, requestId) { return this.call("CreateProduct", request, requestId); }
    updateProduct(request, requestId) { return this.call("UpdateProduct", request, requestId); }
    deleteProduct(request, requestId) { return this.call("DeleteProduct", request, requestId); }

    isReady(timeoutMs = 1000) {
        return new Promise((resolve) =>
            this.client.waitForReady(Date.now() + timeoutMs, (error) => resolve(!error))
        );
    }

    close() { this.client.close(); }
}

module.exports = { ProductClient };