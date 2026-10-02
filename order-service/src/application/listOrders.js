// uid = 0 nghĩa là "tất cả" (Gateway chỉ gửi 0 khi người gọi là ADMIN).
class ListOrders {
    constructor({ orderRepository }) {
        this.orderRepository = orderRepository;
    }

    async execute({ uid }) {
        const items = await this.orderRepository.list({ uid: uid > 0 ? uid : null });
        return { items };
    }
}

module.exports = { ListOrders };