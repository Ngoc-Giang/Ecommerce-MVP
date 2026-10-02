// Tiền tính bằng SỐ NGUYÊN "cent" để tránh sai số số thực (0.1 + 0.2 != 0.3).
// Cột DECIMAL(10,2) chứa tối đa 99,999,999.99 => 9,999,999,999 cent.
const MAX_CENTS = 9999999999;

const toCents = (amount) => Math.round(amount * 100);
const fromCents = (cents) => cents / 100;

// CHÍNH SÁCH GIẢM GIÁ (đề chỉ nêu "dựa trên điểm thành viên", không nêu công thức nên đây là giả định
// duy nhất, gói gọn trong đúng hàm này để thay khi thầy quy định): cứ 100 điểm được giảm 1%, tối đa 100%.
// Ví dụ: score 0 -> 0%, 100 -> 1%, 500 -> 5%, 1000 -> 10%.
const discountPercent = (score) => Math.min(Math.max(score, 0) / 100, 100);

// items: [{ qty, unitPrice }]. Trả về { subtotalCents, discountCents, totalCents }.
const calculateTotals = (items, score) => {
    const subtotalCents = items.reduce((sum, i) => sum + toCents(i.unitPrice) * i.qty, 0);
    const discountCents = Math.round((subtotalCents * discountPercent(score)) / 100);
    return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
};

// Tổng tiền của đơn đã lưu: tiền hàng - discount (discount đã là SỐ TIỀN).
const totalOf = (items, discount) =>
    fromCents(items.reduce((sum, i) => sum + toCents(i.unitPrice) * i.qty, 0) - toCents(discount));

module.exports = { MAX_CENTS, toCents, fromCents, discountPercent, calculateTotals, totalOf };