const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { DomainError } = require("../../domain/errors");

// Cùng vị trí tương đối trong repo và trong container: <gốc>/proto/order.proto
const PROTO_PATH = path.join(__dirname, "../../../../proto/order.proto");

const CODE_TO_STATUS = {
    INVALID_ARGUMENT: grpc.status.INVALID_ARGUMENT,
    NOT_FOUND: grpc.status.NOT_FOUND,
    FAILED_PRECONDITION: grpc.status.FAILED_PRECONDITION,
    UNAVAILABLE: grpc.status.UNAVAILABLE,
    DEADLINE_EXCEEDED: grpc.status.DEADLINE_EXCEEDED
};

const loadProto = () => {
    const definition = protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: Number, defaults: true });
    return grpc.loadPackageDefinition(definition).order;
};

// Lỗi nghiệp vụ -> mã gRPC; lỗi lạ -> INTERNAL (không lộ chi tiết ra ngoài).
const handle = (useCase, logger) => async (call, callback) => {
    try {
        callback(null, await useCase.execute(call.request));
    } catch (error) {
        if (error instanceof DomainError && CODE_TO_STATUS[error.code]) {
            return callback({ code: CODE_TO_STATUS[error.code], message: error.message });
        }
        logger.error(`Unhandled error: ${error.message}`);
        callback({ code: grpc.status.INTERNAL, message: "Internal server error" });
    }
};

const createGrpcServer = ({ createOrder, getOrder, listOrders, logger = console }) => {
    const server = new grpc.Server();
    server.addService(loadProto().OrderService.service, {
        CreateOrder: handle(createOrder, logger),
        GetOrder: handle(getOrder, logger),
        ListOrders: handle(listOrders, logger)
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