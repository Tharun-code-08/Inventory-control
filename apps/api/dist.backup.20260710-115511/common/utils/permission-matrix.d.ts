export declare const PERMISSION_MATRIX: {
    readonly purchaseOrders: {
        readonly read: readonly ["purchase_order:read"];
        readonly create: readonly ["purchase_order:create"];
        readonly confirm: readonly ["purchase_order:create"];
        readonly cancel: readonly ["purchase_order:create"];
        readonly export: readonly ["report:export"];
    };
    readonly goodsReceipts: {
        readonly read: readonly ["goods_receipt:read"];
        readonly create: readonly ["goods_receipt:create"];
        readonly post: readonly ["goods_receipt:create"];
        readonly delete: readonly ["goods_receipt:create"];
    };
    readonly payments: {
        readonly read: readonly ["shop:read"];
        readonly create: readonly ["shop:write"];
    };
    readonly users: {
        readonly manage: readonly ["user:manage"];
    };
    readonly reports: {
        readonly view: readonly ["report:view"];
        readonly export: readonly ["report:export"];
    };
};
export type PermissionMatrix = typeof PERMISSION_MATRIX;
