"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierPaymentAction = exports.SupplierBillAction = exports.GrAction = exports.RfqAction = exports.PurchaseOrderAction = void 0;
var PurchaseOrderAction;
(function (PurchaseOrderAction) {
    PurchaseOrderAction["EDIT"] = "EDIT";
    PurchaseOrderAction["CONFIRM"] = "CONFIRM";
    PurchaseOrderAction["CANCEL"] = "CANCEL";
    PurchaseOrderAction["SEND"] = "SEND";
})(PurchaseOrderAction || (exports.PurchaseOrderAction = PurchaseOrderAction = {}));
var RfqAction;
(function (RfqAction) {
    RfqAction["EDIT"] = "EDIT";
    RfqAction["POST"] = "POST";
    RfqAction["SEND"] = "SEND";
    RfqAction["CREATE_PO"] = "CREATE_PO";
})(RfqAction || (exports.RfqAction = RfqAction = {}));
var GrAction;
(function (GrAction) {
    GrAction["EDIT"] = "EDIT";
    GrAction["DELETE"] = "DELETE";
    GrAction["POST"] = "POST";
    GrAction["SEND"] = "SEND";
    GrAction["CREATE_BILL"] = "CREATE_BILL";
})(GrAction || (exports.GrAction = GrAction = {}));
var SupplierBillAction;
(function (SupplierBillAction) {
    SupplierBillAction["SEND"] = "SEND";
    SupplierBillAction["RECORD_PAYMENT"] = "RECORD_PAYMENT";
    SupplierBillAction["VOID"] = "VOID";
})(SupplierBillAction || (exports.SupplierBillAction = SupplierBillAction = {}));
var SupplierPaymentAction;
(function (SupplierPaymentAction) {
    SupplierPaymentAction["REVERSE"] = "REVERSE";
})(SupplierPaymentAction || (exports.SupplierPaymentAction = SupplierPaymentAction = {}));
//# sourceMappingURL=document-actions.js.map