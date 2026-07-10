"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_MATRIX = void 0;
exports.PERMISSION_MATRIX = {
    purchaseOrders: {
        read: ['purchase_order:read'],
        create: ['purchase_order:create'],
        confirm: ['purchase_order:create'],
        cancel: ['purchase_order:create'],
        export: ['report:export'],
    },
    goodsReceipts: {
        read: ['goods_receipt:read'],
        create: ['goods_receipt:create'],
        post: ['goods_receipt:create'],
        delete: ['goods_receipt:create'],
    },
    payments: {
        read: ['shop:read'],
        create: ['shop:write'],
    },
    users: {
        manage: ['user:manage'],
    },
    reports: {
        view: ['report:view'],
        export: ['report:export'],
    },
};
//# sourceMappingURL=permission-matrix.js.map