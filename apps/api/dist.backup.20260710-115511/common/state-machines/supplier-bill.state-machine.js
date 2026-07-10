"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPLIER_BILL_REVERSAL_TRANSITIONS = exports.SUPPLIER_BILL_ACTIONS = exports.SUPPLIER_BILL_TRANSITIONS = void 0;
const client_1 = require("@prisma/client");
const document_actions_1 = require("./document-actions");
exports.SUPPLIER_BILL_TRANSITIONS = {
    [client_1.SupplierBillStatus.DRAFT]: [client_1.SupplierBillStatus.ISSUED],
    [client_1.SupplierBillStatus.ISSUED]: [
        client_1.SupplierBillStatus.PARTIALLY_PAID,
        client_1.SupplierBillStatus.PAID,
        client_1.SupplierBillStatus.VOID,
    ],
    [client_1.SupplierBillStatus.PARTIALLY_PAID]: [client_1.SupplierBillStatus.PAID, client_1.SupplierBillStatus.VOID],
    [client_1.SupplierBillStatus.PAID]: [],
    [client_1.SupplierBillStatus.VOID]: [],
};
exports.SUPPLIER_BILL_ACTIONS = {
    [document_actions_1.SupplierBillAction.SEND]: [
        client_1.SupplierBillStatus.ISSUED,
        client_1.SupplierBillStatus.PARTIALLY_PAID,
        client_1.SupplierBillStatus.PAID,
    ],
    [document_actions_1.SupplierBillAction.RECORD_PAYMENT]: [
        client_1.SupplierBillStatus.ISSUED,
        client_1.SupplierBillStatus.PARTIALLY_PAID,
    ],
    [document_actions_1.SupplierBillAction.VOID]: [client_1.SupplierBillStatus.ISSUED],
};
exports.SUPPLIER_BILL_REVERSAL_TRANSITIONS = {
    [client_1.SupplierBillStatus.PAID]: [client_1.SupplierBillStatus.PARTIALLY_PAID, client_1.SupplierBillStatus.ISSUED],
    [client_1.SupplierBillStatus.PARTIALLY_PAID]: [client_1.SupplierBillStatus.ISSUED],
};
//# sourceMappingURL=supplier-bill.state-machine.js.map