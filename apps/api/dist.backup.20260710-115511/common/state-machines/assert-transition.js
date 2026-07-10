"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPoTransition = assertPoTransition;
exports.assertRfqTransition = assertRfqTransition;
exports.assertGrTransition = assertGrTransition;
exports.assertSupplierBillTransition = assertSupplierBillTransition;
exports.assertSupplierBillReversalTransition = assertSupplierBillReversalTransition;
exports.assertTransition = assertTransition;
const common_1 = require("@nestjs/common");
const gr_state_machine_1 = require("./gr.state-machine");
const po_state_machine_1 = require("./po.state-machine");
const rfq_state_machine_1 = require("./rfq.state-machine");
const supplier_bill_state_machine_1 = require("./supplier-bill.state-machine");
function assertPoTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus)
        return;
    const allowed = po_state_machine_1.PO_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
        throw new common_1.BadRequestException(`Invalid purchase order status transition: ${fromStatus} -> ${toStatus}`);
    }
}
function assertRfqTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus)
        return;
    const allowed = rfq_state_machine_1.RFQ_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
        throw new common_1.BadRequestException(`Invalid RFQ status transition: ${fromStatus} -> ${toStatus}`);
    }
}
function assertGrTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus)
        return;
    const allowed = gr_state_machine_1.GR_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
        throw new common_1.BadRequestException(`Invalid goods receipt status transition: ${fromStatus} -> ${toStatus}`);
    }
}
function assertSupplierBillTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus)
        return;
    const allowed = supplier_bill_state_machine_1.SUPPLIER_BILL_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
        throw new common_1.BadRequestException(`Invalid supplier bill status transition: ${fromStatus} -> ${toStatus}`);
    }
}
function assertSupplierBillReversalTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus)
        return;
    const allowed = supplier_bill_state_machine_1.SUPPLIER_BILL_REVERSAL_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
        throw new common_1.BadRequestException(`Invalid supplier bill reversal transition: ${fromStatus} -> ${toStatus}`);
    }
}
function assertTransition(documentType, fromStatus, toStatus) {
    if (documentType === 'PO') {
        assertPoTransition(fromStatus, toStatus);
        return;
    }
    assertRfqTransition(fromStatus, toStatus);
}
//# sourceMappingURL=assert-transition.js.map