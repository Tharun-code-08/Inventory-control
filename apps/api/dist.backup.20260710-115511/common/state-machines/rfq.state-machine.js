"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RFQ_ACTIONS = exports.RFQ_TRANSITIONS = void 0;
const client_1 = require("@prisma/client");
const document_actions_1 = require("./document-actions");
exports.RFQ_TRANSITIONS = {
    [client_1.DocumentStatus.DRAFT]: [client_1.DocumentStatus.POSTED],
    [client_1.DocumentStatus.POSTED]: [],
};
exports.RFQ_ACTIONS = {
    [document_actions_1.RfqAction.EDIT]: [client_1.DocumentStatus.DRAFT],
    [document_actions_1.RfqAction.POST]: [client_1.DocumentStatus.DRAFT],
    [document_actions_1.RfqAction.SEND]: [client_1.DocumentStatus.POSTED],
    [document_actions_1.RfqAction.CREATE_PO]: [client_1.DocumentStatus.POSTED],
};
//# sourceMappingURL=rfq.state-machine.js.map