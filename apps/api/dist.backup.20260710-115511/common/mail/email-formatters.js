"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEmailDate = formatEmailDate;
exports.formatEmailMoney = formatEmailMoney;
function formatEmailDate(value) {
    if (!value)
        return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime()))
        return '—';
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
function formatEmailMoney(value, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(Number(value));
}
//# sourceMappingURL=email-formatters.js.map