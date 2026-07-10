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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformHealthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const os = require("os");
const promises_1 = require("fs/promises");
const path = require("path");
const prisma_service_1 = require("../../prisma/prisma.service");
const metrics_service_1 = require("../../common/observability/metrics.service");
const client_1 = require("@prisma/client");
const platform_notification_constants_1 = require("./platform-notification.constants");
const platform_notification_service_1 = require("./platform-notification.service");
const MONITORED_QUEUES = [
    'exports',
    'notifications',
    'backups',
    'subscription-lifecycle',
    'document-email',
    'platform-checks',
];
let PlatformHealthService = class PlatformHealthService {
    prisma;
    config;
    metrics;
    notifications;
    lastHttpErrorTotal = 0;
    constructor(prisma, config, metrics, notifications) {
        this.prisma = prisma;
        this.config = config;
        this.metrics = metrics;
        this.notifications = notifications;
    }
    async collectSnapshot() {
        const [dbSize, diskPaths, queueStats, cpuLoad, memoryPct, httpErrors] = await Promise.all([
            this.getDatabaseSizeBytes(),
            this.getDiskUsage(),
            this.getQueueStats(),
            this.getCpuLoadPct(),
            this.getMemoryUsagePct(),
            this.getHttpErrorDelta(),
        ]);
        const dbLimit = Number(this.config.get('PLATFORM_DB_LIMIT_BYTES') ??
            process.env.PLATFORM_DB_LIMIT_BYTES ??
            String(10 * 1024 * 1024 * 1024));
        const dbUsagePct = dbLimit > 0 ? (dbSize / dbLimit) * 100 : 0;
        return {
            timestamp: new Date().toISOString(),
            database: { sizeBytes: dbSize, limitBytes: dbLimit, usagePct: Math.round(dbUsagePct * 10) / 10 },
            disk: diskPaths,
            queues: queueStats,
            cpuLoadPct: Math.round(cpuLoad * 10) / 10,
            memoryUsagePct: Math.round(memoryPct * 10) / 10,
            httpErrorsDelta5m: httpErrors,
        };
    }
    async getDatabaseSizeBytes() {
        const rows = await this.prisma.$queryRaw `
      SELECT pg_database_size(current_database()) AS size
    `;
        return Number(rows[0]?.size ?? 0);
    }
    async getDiskUsage() {
        const dirs = [
            this.config.get('BACKUP_STORAGE_DIR') ?? './storage/backups',
            this.config.get('EXPORT_STORAGE_DIR') ?? './storage/exports',
            this.config.get('UPLOAD_STORAGE_DIR') ?? './storage/uploads',
        ];
        const results = [];
        for (const dir of dirs) {
            try {
                const resolved = path.resolve(dir);
                const stats = await (0, promises_1.statfs)(resolved);
                const total = Number(stats.blocks) * Number(stats.bsize);
                const free = Number(stats.bfree) * Number(stats.bsize);
                const freePct = total > 0 ? (free / total) * 100 : 100;
                results.push({ path: resolved, freePct: Math.round(freePct * 10) / 10, freeBytes: free });
            }
            catch {
                results.push({ path: dir, freePct: -1, freeBytes: 0 });
            }
        }
        return results;
    }
    async getQueueStats() {
        const connection = {
            host: this.config.get('REDIS_HOST') ?? process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(this.config.get('REDIS_PORT') ?? process.env.REDIS_PORT ?? '6379'),
        };
        const stats = {};
        for (const name of MONITORED_QUEUES) {
            const queue = new bullmq_1.Queue(name, { connection });
            try {
                const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed');
                stats[name] = {
                    waiting: counts.waiting ?? 0,
                    active: counts.active ?? 0,
                    failed: counts.failed ?? 0,
                    delayed: counts.delayed ?? 0,
                };
            }
            catch {
                stats[name] = { waiting: -1, active: -1, failed: -1, delayed: -1 };
            }
            finally {
                await queue.close();
            }
        }
        return stats;
    }
    getCpuLoadPct() {
        const cpus = os.cpus().length || 1;
        const load = os.loadavg()[0] ?? 0;
        return Math.min(100, (load / cpus) * 100);
    }
    getMemoryUsagePct() {
        const total = os.totalmem();
        const used = total - os.freemem();
        return total > 0 ? (used / total) * 100 : 0;
    }
    async getHttpErrorDelta() {
        const metric = await this.metrics.httpErrors.get();
        const total = metric.values.reduce((sum, row) => sum + row.value, 0);
        const delta = Math.max(0, total - this.lastHttpErrorTotal);
        this.lastHttpErrorTotal = total;
        return delta;
    }
    async runHealthChecks() {
        const snapshot = await this.collectSnapshot();
        let dispatched = 0;
        if (snapshot.database.usagePct >= 90) {
            const result = await this.notifications.dispatch({
                category: client_1.PlatformNotificationCategory.HEALTH,
                severity: client_1.PlatformNotificationSeverity.CRITICAL,
                notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.DB_STORAGE_90,
                title: 'Database storage critical',
                message: `Database is at ${snapshot.database.usagePct}% of configured limit.`,
                actionUrl: '/platform/subscriptions',
                dedupeHours: 12,
                emailImmediate: true,
                emailDedupe: {
                    templateId: 'platform_db_storage_90',
                    entityType: 'health',
                    entityId: 'db_storage_90',
                },
            });
            if (!('skipped' in result))
                dispatched += 1;
        }
        else if (snapshot.database.usagePct >= 80) {
            const result = await this.notifications.dispatch({
                category: client_1.PlatformNotificationCategory.HEALTH,
                severity: client_1.PlatformNotificationSeverity.WARNING,
                notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.DB_STORAGE_80,
                title: 'Database storage warning',
                message: `Database is at ${snapshot.database.usagePct}% of configured limit.`,
                actionUrl: '/platform/subscriptions',
                dedupeHours: 24,
                emailImmediate: true,
                emailDedupe: {
                    templateId: 'platform_db_storage_80',
                    entityType: 'health',
                    entityId: 'db_storage_80',
                },
            });
            if (!('skipped' in result))
                dispatched += 1;
        }
        if (snapshot.cpuLoadPct >= 80) {
            const result = await this.notifications.dispatch({
                category: client_1.PlatformNotificationCategory.HEALTH,
                severity: client_1.PlatformNotificationSeverity.WARNING,
                notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.SERVER_CPU_HIGH,
                title: 'Server CPU high',
                message: `CPU load is ${snapshot.cpuLoadPct}% across ${os.cpus().length} cores.`,
                dedupeHours: 1,
                emailImmediate: true,
                emailDedupe: {
                    templateId: 'platform_cpu_high',
                    entityType: 'health',
                    entityId: new Date().toISOString().slice(0, 13),
                },
            });
            if (!('skipped' in result))
                dispatched += 1;
        }
        if (snapshot.memoryUsagePct >= 80) {
            const result = await this.notifications.dispatch({
                category: client_1.PlatformNotificationCategory.HEALTH,
                severity: client_1.PlatformNotificationSeverity.WARNING,
                notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.SERVER_MEMORY_HIGH,
                title: 'Server memory high',
                message: `Memory usage is ${snapshot.memoryUsagePct}%.`,
                dedupeHours: 1,
                emailImmediate: true,
                emailDedupe: {
                    templateId: 'platform_memory_high',
                    entityType: 'health',
                    entityId: new Date().toISOString().slice(0, 13),
                },
            });
            if (!('skipped' in result))
                dispatched += 1;
        }
        for (const disk of snapshot.disk) {
            if (disk.freePct >= 0 && disk.freePct < 15) {
                const result = await this.notifications.dispatch({
                    category: client_1.PlatformNotificationCategory.HEALTH,
                    severity: client_1.PlatformNotificationSeverity.CRITICAL,
                    notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.VPS_DISK_LOW,
                    title: 'Disk space low',
                    message: `${disk.path} has only ${disk.freePct}% free space.`,
                    dedupeHours: 6,
                    emailImmediate: true,
                    emailDedupe: {
                        templateId: 'platform_disk_low',
                        entityType: 'path',
                        entityId: disk.path.replace(/[^a-zA-Z0-9]/g, '_'),
                    },
                });
                if (!('skipped' in result))
                    dispatched += 1;
            }
        }
        if (snapshot.httpErrorsDelta5m >= 10) {
            const result = await this.notifications.dispatch({
                category: client_1.PlatformNotificationCategory.HEALTH,
                severity: client_1.PlatformNotificationSeverity.HIGH,
                notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.API_ERROR_RATE_HIGH,
                title: 'API error rate elevated',
                message: `${snapshot.httpErrorsDelta5m} server errors recorded since the last health check.`,
                dedupeHours: 1,
                emailImmediate: true,
                emailDedupe: {
                    templateId: 'platform_api_errors',
                    entityType: 'health',
                    entityId: new Date().toISOString().slice(0, 13),
                },
            });
            if (!('skipped' in result))
                dispatched += 1;
        }
        for (const [queueName, counts] of Object.entries(snapshot.queues)) {
            if (counts.failed >= 10 || counts.waiting >= 50) {
                const result = await this.notifications.dispatch({
                    category: client_1.PlatformNotificationCategory.HEALTH,
                    severity: client_1.PlatformNotificationSeverity.WARNING,
                    notificationKey: `${platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.QUEUE_BACKLOG_HIGH}:${queueName}`,
                    title: `Queue backlog: ${queueName}`,
                    message: `waiting=${counts.waiting}, failed=${counts.failed}, active=${counts.active}`,
                    dedupeHours: 2,
                    emailImmediate: false,
                });
                if (!('skipped' in result))
                    dispatched += 1;
            }
        }
        return { dispatched, snapshot };
    }
};
exports.PlatformHealthService = PlatformHealthService;
exports.PlatformHealthService = PlatformHealthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        metrics_service_1.MetricsService,
        platform_notification_service_1.PlatformNotificationService])
], PlatformHealthService);
//# sourceMappingURL=platform-health.service.js.map