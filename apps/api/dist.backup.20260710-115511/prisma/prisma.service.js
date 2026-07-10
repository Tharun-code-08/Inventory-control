"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const request_context_1 = require("../common/context/request-context");
const SOFT_DELETE_MODELS = new Set(['User', 'Supplier']);
const READ_OPS = new Set([
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'count',
    'aggregate',
    'groupBy',
]);
function applyDeletedAtFilter(rawArgs) {
    const args = (rawArgs ?? {});
    const existingWhere = (args.where ?? {});
    if (Object.prototype.hasOwnProperty.call(existingWhere, 'deletedAt')) {
        return args;
    }
    return { ...args, where: { ...existingWhere, deletedAt: null } };
}
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'warn' },
                { emit: 'event', level: 'error' },
            ],
        });
        const slowMs = Number(process.env.SLOW_QUERY_MS ?? '200');
        this.$on('query', (event) => {
            if (event.duration >= slowMs) {
                const ctx = request_context_1.RequestContextStore.get();
                const requestId = ctx?.requestId ?? null;
                this.logger.warn(`[slow-query] ${event.duration}ms ${requestId ? `req=${requestId} ` : ''}${event.query.replace(/\s+/g, ' ').slice(0, 240)}`);
            }
        });
        const extended = this.$extends({
            query: {
                $allModels: {
                    async $allOperations({ model, operation, args, query }) {
                        if (!model || !SOFT_DELETE_MODELS.has(model)) {
                            return query(args);
                        }
                        if (READ_OPS.has(operation)) {
                            return query(applyDeletedAtFilter(args));
                        }
                        return query(args);
                    },
                },
            },
        });
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (Reflect.has(target, prop)) {
                    return Reflect.get(target, prop, receiver);
                }
                const value = Reflect.get(extended, prop);
                if (typeof value === 'function') {
                    return value.bind(extended);
                }
                return value;
            },
        });
    }
    async softDelete(model, where) {
        const delegate = this[model];
        await delegate.update({ where, data: { deletedAt: new Date() } });
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map