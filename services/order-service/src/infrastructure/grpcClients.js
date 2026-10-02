const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { DomainError } = require("../domain/errors");

// <gốc>/order-service/src/infrastructure -> lên 3 cấp là <gốc>, nơi có thư mục proto/ (cả trong repo lẫn container /app).
const PROTO_DIR = path.join(__dirname, "../../../proto");

const loadService = (file, pkg) =>
    grpc.loadPackageDefinition(
        protoLoader.loadSync(path.join(PROTO_DIR, file), { keepCase: false, longs: Number, defaults: true })
    )[pkg];

// Dịch lỗi gRPC của service phụ thuộc sang lỗi của Order Service.
//  - NOT_FOUND / INVALID_ARGUMENT / FAILED_PRECONDITION (hết hàng): là lời nhắn nghiệp vụ do chính hệ thống ta sinh ra => giữ nguyên.
//  - UNAVAILABLE / DEADLINE_EXCEEDED: dùng thông điệp chung, không lộ địa chỉ nội bộ.
//  - Còn lại: trả nguyên lỗi để tầng trên ghi log và trả INTERNAL.
const translate = (error) => {
    switch (error.code) {
        case grpc.status.NOT_FOUND: return new DomainError("NOT_FOUND", error.details);
        case grpc.status.INVALID_ARGUMENT: return new DomainError("INVALID_ARGUMENT", error.details);
        case grpc.status.FAILED_PRECONDITION: return new DomainError("FAILED_PRECONDITION", error.details);
        case grpc.status.DEADLINE_EXCEEDED: return new DomainError("DEADLINE_EXCEEDED", "Downstream service timed out");
        case grpc.status.UNAVAILABLE: return new DomainError("UNAVAILABLE", "Downstream service unavailable");
        default: return error;
    }
};

class GrpcClient {
    constructor(Service, { url, timeoutMs }) {
        this.timeoutMs = timeoutMs;
        this.client = new Service(url, grpc.credentials.createInsecure());
    }

    call(method, request) {
        return new Promise((resolve, reject) => {
            this.client[method](request, { deadline: Date.now() + this.timeoutMs }, (error, response) =>
                error ? reject(translate(error)) : resolve(response)
            );
        });
    }

    close() { this.client.close(); }
}

// Order -> Customer: lấy thông tin Customer kèm Membership (score).
class GrpcCustomerGateway extends GrpcClient {
    constructor(options) { super(loadService("customer.proto", "customer").CustomerService, options); }
    getCustomer(uid) { return this.call("GetCustomer", { uid }); }
}

// Order -> Product: trừ kho (kiểm tra + trừ, cả lô hoặc không) và hoàn kho khi bước sau thất bại.
class GrpcProductGateway extends GrpcClient {
    constructor(options) { super(loadService("product.proto", "product").ProductService, options); }
    async reserveStock(items) { return (await this.call("ReserveStock", { items })).items; }
    async releaseStock(items) { await this.call("ReleaseStock", { items }); }
}

module.exports = { GrpcCustomerGateway, GrpcProductGateway, translate };