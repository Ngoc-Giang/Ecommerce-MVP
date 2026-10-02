const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { DomainError } = require("../../domain/errors");

// Cùng vị trí tương đối trong repo và trong container: <gốc>/proto/product.proto
const PROTO_PATH = path.join(__dirname, "../../../../proto/product.proto");

const CODE_TO_STATUS = {
    INVALID_ARGUMENT: grpc.status.INVALID_ARGUMENT,
    NOT_FOUND: grpc.status.NOT_FOUND,
    FAILED_PRECONDITION: grpc.status.FAILED_PRECONDITION // không đủ tồn kho -> Gateway/Order ánh xạ 409
};

const loadProto = () => {
    const definition = protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: Number, defaults: true });
    return grpc.loadPackageDefinition(definition).product;
};

// Lỗi nghiệp vụ -> mã gRPC; lỗi lạ -> INTERNAL (không lộ chi tiết ra ngoài).
const handle = (useCase, logger) => async (call, callback) => {
    try {
        callback(null, await useCase.execute(call.request));
    } catch (error) {
        if (error instanceof DomainError) {
            return callback({ code: CODE_TO_STATUS[error.code], message: error.message });
        }
        logger.error(`Unhandled error: ${error.message}`);
        callback({ code: grpc.status.INTERNAL, message: "Internal server error" });
    }
};

const createGrpcServer = ({ listProducts, getProduct, createProduct, updateProduct, deleteProduct, reserveStock, releaseStock, logger = console }) => {
    const server = new grpc.Server();
    server.addService(loadProto().ProductService.service, {
        ListProducts: handle(listProducts, logger),
        GetProduct: handle(getProduct, logger),
        CreateProduct: handle(createProduct, logger),
        UpdateProduct: handle(updateProduct, logger),
        DeleteProduct: handle(deleteProduct, logger),
        ReserveStock: handle(reserveStock, logger),
        ReleaseStock: handle(releaseStock, logger)
    });
    return server;
};

const listen = (server, port) =>
    new Promise((resolve, reject) => {
        // Kênh không mã hoá: chỉ chạy trong mạng nội bộ Docker (không publish port ra ngoài).
        server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) =>
            err ? reject(err) : resolve(boundPort)
        );
    });

module.exports = { createGrpcServer, listen, loadProto, PROTO_PATH };