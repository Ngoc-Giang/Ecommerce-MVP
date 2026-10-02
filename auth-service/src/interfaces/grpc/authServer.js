const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { DomainError } = require("../../domain/errors");

// Cùng vị trí tương đối trong repo và trong container: <gốc>/proto/auth.proto
const PROTO_PATH = path.join(__dirname, "../../../../proto/auth.proto");

const CODE_TO_STATUS = {
    INVALID_ARGUMENT: grpc.status.INVALID_ARGUMENT,
    ALREADY_EXISTS: grpc.status.ALREADY_EXISTS,
    UNAUTHENTICATED: grpc.status.UNAUTHENTICATED
};

const loadProto = () => {
    const definition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: false, // access_token -> accessToken
        longs: Number,
        defaults: true
    });
    return grpc.loadPackageDefinition(definition).auth;
};

const handle = (useCase, logger) => async (call, callback) => {
    try {
        callback(null, await useCase.execute(call.request));
    } catch (error) {
        if (error instanceof DomainError) {
            return callback({ code: CODE_TO_STATUS[error.code], message: error.message });
        }
        logger.error(`Unhandled error: ${error.message}`); // không log request (chứa mật khẩu)
        callback({ code: grpc.status.INTERNAL, message: "Internal server error" });
    }
};

const createGrpcServer = ({ registerUser, loginUser, verifyToken, logger = console }) => {
    const server = new grpc.Server();
    server.addService(loadProto().AuthService.service, {
        Register: handle(registerUser, logger),
        Login: handle(loginUser, logger),
        VerifyToken: handle(verifyToken, logger)
    });
    return server;
};

const listen = (server, port) =>
    new Promise((resolve, reject) => {
        // Kênh không mã hoá: chỉ chạy trong mạng nội bộ Docker.
        server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) =>
            err ? reject(err) : resolve(boundPort)
        );
    });

module.exports = { createGrpcServer, listen, loadProto, PROTO_PATH };