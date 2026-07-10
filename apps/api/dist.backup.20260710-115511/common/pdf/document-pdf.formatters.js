"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
exports.formatDocumentDate = formatDocumentDate;
exports.formatDocumentDateTime = formatDocumentDateTime;
exports.formatDocumentMoney = formatDocumentMoney;
exports.formatDocumentCurrency = formatDocumentCurrency;
exports.formatDocumentAmount = formatDocumentAmount;
exports.amountInIndianWords = amountInIndianWords;
exports.documentPdfFilename = documentPdfFilename;
exports.splitAddressLines = splitAddressLines;
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function formatDocumentDate(iso) {
    const d = iso instanceof Date ? iso : new Date(iso);
    if (Number.isNaN(d.getTime()))
        return String(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
}
function formatDocumentDateTime(iso) {
    const d = iso instanceof Date ? iso : new Date(iso);
    if (Number.isNaN(d.getTime()))
        return String(iso);
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function formatDocumentMoney(value) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
}
function formatDocumentCurrency(value, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
}
function formatDocumentAmount(value) {
    return formatDocumentMoney(value);
}
const INDIAN_ONES = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
];
const INDIAN_TENS = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
];
function twoDigitsIndian(n) {
    if (n < 20)
        return INDIAN_ONES[n];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${INDIAN_TENS[tens]}${ones ? ` ${INDIAN_ONES[ones]}` : ''}`.trim();
}
function threeDigitsIndian(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (hundred === 0)
        return twoDigitsIndian(rest);
    return `${INDIAN_ONES[hundred]} Hundred${rest ? ` ${twoDigitsIndian(rest)}` : ''}`;
}
function amountInIndianWords(amount, currencyLabel = 'Indian Rupee') {
    const value = Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;
    const rupees = Math.floor(value);
    const paise = Math.round((value - rupees) * 100);
    if (rupees === 0 && paise === 0)
        return `${currencyLabel} Zero Only`;
    const parts = [];
    let remaining = rupees;
    const crore = Math.floor(remaining / 10_000_000);
    if (crore > 0) {
        parts.push(`${threeDigitsIndian(crore)} Crore`);
        remaining %= 10_000_000;
    }
    const lakh = Math.floor(remaining / 100_000);
    if (lakh > 0) {
        parts.push(`${threeDigitsIndian(lakh)} Lakh`);
        remaining %= 100_000;
    }
    const thousand = Math.floor(remaining / 1000);
    if (thousand > 0) {
        parts.push(`${threeDigitsIndian(thousand)} Thousand`);
        remaining %= 1000;
    }
    if (remaining > 0) {
        parts.push(threeDigitsIndian(remaining));
    }
    let words = `${currencyLabel} ${parts.join(' ')}`.trim();
    if (paise > 0) {
        words += ` and ${twoDigitsIndian(paise)} Paise`;
    }
    return `${words} Only`;
}
function documentPdfFilename(prefix, documentNumber) {
    const safe = documentNumber.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_') || prefix;
    return `${safe}.pdf`;
}
function splitAddressLines(address) {
    if (!address?.trim())
        return [];
    return address
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
}
//# sourceMappingURL=document-pdf.formatters.js.map