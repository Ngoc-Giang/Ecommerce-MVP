// Composition root: nơi DUY NHẤT nối use case với cài đặt hạ tầng.
const { ListProducts } = require("./application/listProducts");
const { GetProduct } = require("./application/getProduct");
const { CreateProduct } = require("./application/createProduct");
const { UpdateProduct } = require("./application/updateProduct");
const { DeleteProduct } = require("./application/deleteProduct");
const { ReserveStock } = require("./application/reserveStock");
const { ReleaseStock } = require("./application/releaseStock");
const { MongoProductRepository } = require("./infrastructure/mongoProductRepository");

const buildContainer = ({ db, logger = console }) => {
    const productRepository = new MongoProductRepository(db);
    return {
        productRepository,
        listProducts: new ListProducts({ productRepository }),
        getProduct: new GetProduct({ productRepository }),
        createProduct: new CreateProduct({ productRepository }),
        updateProduct: new UpdateProduct({ productRepository }),
        deleteProduct: new DeleteProduct({ productRepository }),
        reserveStock: new ReserveStock({ productRepository, logger }),
        releaseStock: new ReleaseStock({ productRepository })
    };
};

module.exports = { buildContainer };