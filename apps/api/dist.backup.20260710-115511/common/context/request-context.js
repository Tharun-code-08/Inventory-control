"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContextStore = void 0;
const node_async_hooks_1 = require("node:async_hooks");
const storage = new node_async_hooks_1.AsyncLocalStorage();
exports.RequestContextStore = {
    run(context, fn) {
        return storage.run(context, fn);
    },
    get() {
        return storage.getStore();
    },
    getRequestId() {
        return storage.getStore()?.requestId;
    },
    patch(patch) {
        const current = storage.getStore();
        if (!current)
            return;
        Object.assign(current, patch);
    },
};
//# sourceMappingURL=request-context.js.map