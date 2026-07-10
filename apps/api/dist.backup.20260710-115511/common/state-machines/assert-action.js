"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPoAction = assertPoAction;
exports.assertRfqAction = assertRfqAction;
exports.assertGrAction = assertGrAction;
exports.assertSupplierBillAction = assertSupplierBillAction;
exports.assertAction = assertAction;
const common_1 = require("@nestjs/common");
const gr_state_machine_1 = require("./gr.state-machine");
const po_state_machine_1 = require("./po.state-machine");
const rfq_state_machine_1 = require("./rfq.state-machine");
const supplier_bill_state_machine_1 = require("./supplier-bill.state-machine");
function assertPoAction(status, action) {
    const allowed = po_state_machine_1.PO_ACTIONS[action] ?? [];
    if (!allowed.includes(status)) {
        throw new common_1.BadRequestException(`Purchase order action ${action} is not allowed in status ${status}`);
    }
}
function assertRfqAction(status, action) {
    const allowed = rfq_state_machine_1.RFQ_ACTIONS[action] ?? [];
    if (!allowed.includes(status)) {
        throw new common_1.BadRequestException(`RFQ action ${action} is not allowed in status ${status}`);
    }
}
function assertGrAction(status, action) {
    const allowed = gr_state_machine_1.GR_ACTIONS[action] ?? [];
    if (!allowed.includes(status)) {
        throw new common_1.BadRequestException(`Goods receipt action ${action} is not allowed in status ${status}`);
    }
}
function assertSupplierBillAction(status, action) {
    const allowed = supplier_bill_state_machine_1.SUPPLIER_BILL_ACTIONS[action] ?? [];
    if (!allowed.includes(status)) {
        throw new common_1.BadRequestException(`Supplier bill action ${action} is not allowed in status ${status}`);
    }
}
function assertAction(documentType, status, action) {
    if (documentType === 'PO') {
        assertPoAction(status, action);
        return;
    }
    assertRfqAction(status, action);
}
//# sourceMappingURL=assert-action.js.map