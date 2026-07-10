"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PO_ACTIONS = exports.PO_TRANSITIONS = void 0;
const client_1 = require("@prisma/client");
const document_actions_1 = require("./document-actions");
exports.PO_TRANSITIONS = {
    [client_1.PurchaseOrderStatus.DRAFT]: [
        client_1.PurchaseOrderStatus.CONFIRMED,
        client_1.PurchaseOrderStatus.CANCELLED,
    ],
    [client_1.PurchaseOrderStatus.CONFIRMED]: [client_1.PurchaseOrderStatus.CANCELLED],
    [client_1.PurchaseOrderStatus.CANCELLED]: [],
};
exports.PO_ACTIONS = {
    [document_actions_1.PurchaseOrderAction.EDIT]: [client_1.PurchaseOrderStatus.DRAFT],
    [document_actions_1.PurchaseOrderAction.CONFIRM]: [client_1.PurchaseOrderStatus.DRAFT],
    [document_actions_1.PurchaseOrderAction.CANCEL]: [
        client_1.PurchaseOrderStatus.DRAFT,
        client_1.PurchaseOrderStatus.CONFIRMED,
    ],
    [document_actions_1.PurchaseOrderAction.SEND]: [client_1.PurchaseOrderStatus.CONFIRMED],
};
//# sourceMappingURL=po.state-machine.js.map