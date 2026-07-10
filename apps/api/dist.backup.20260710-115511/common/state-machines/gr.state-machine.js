"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GR_ACTIONS = exports.GR_TRANSITIONS = void 0;
const client_1 = require("@prisma/client");
const document_actions_1 = require("./document-actions");
exports.GR_TRANSITIONS = {
    [client_1.DocumentStatus.DRAFT]: [client_1.DocumentStatus.POSTED],
    [client_1.DocumentStatus.POSTED]: [],
};
exports.GR_ACTIONS = {
    [document_actions_1.GrAction.EDIT]: [client_1.DocumentStatus.DRAFT],
    [document_actions_1.GrAction.DELETE]: [client_1.DocumentStatus.DRAFT],
    [document_actions_1.GrAction.POST]: [client_1.DocumentStatus.DRAFT],
    [document_actions_1.GrAction.SEND]: [client_1.DocumentStatus.POSTED],
    [document_actions_1.GrAction.CREATE_BILL]: [client_1.DocumentStatus.POSTED],
};
//# sourceMappingURL=gr.state-machine.js.map