"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./load-env");
const path = require("node:path");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const cookieParser = require("cookie-parser");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const request_context_middleware_1 = require("./common/context/request-context.middleware");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const deprecation_interceptor_1 = require("./common/interceptors/deprecation.interceptor");
const response_envelope_interceptor_1 = require("./common/interceptors/response-envelope.interceptor");
const sentry_1 = require("./common/observability/sentry");
function webCorsOrigin() {
    const raw = process.env.WEB_ORIGIN?.trim();
    if (raw) {
        const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
        if (list.length > 0)
            return list;
    }
    return defaultWebOrigins();
}
function defaultWebOrigins() {
    return [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5200',
        'http://127.0.0.1:5200',
    ];
}
function tunnelOriginsAllowed() {
    const flag = String(process.env.ALLOW_TUNNEL_ORIGINS ?? '').toLowerCase();
    if (flag === '1' || flag === 'true' || flag === 'yes')
        return true;
    return process.env.NODE_ENV !== 'production' && flag !== 'false';
}
function corsOptions() {
    const allowList = webCorsOrigin();
    const allowTunnels = tunnelOriginsAllowed();
    return {
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (allowList.includes(origin)) {
                callback(null, true);
                return;
            }
            if (allowTunnels && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`Origin ${origin} not allowed by CORS`), false);
        },
        credentials: true,
        exposedHeaders: ['Deprecation', 'Sunset', 'Link', 'x-request-id', 'traceparent'],
    };
}
async function bootstrap() {
    (0, sentry_1.initSentry)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.set('trust proxy', 1);
    const httpLogger = new common_1.Logger('Http');
    app.useBodyParser('json', { limit: '50mb' });
    app.useBodyParser('urlencoded', { limit: '50mb', extended: true });
    app.enableShutdownHooks();
    const uploadDir = path.resolve(process.env.UPLOAD_STORAGE_DIR ?? './storage/uploads');
    app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
    app.setGlobalPrefix('api/v1');
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    const cookieSecret = process.env.COOKIE_SECRET?.trim();
    app.use(cookieParser(cookieSecret && cookieSecret.length > 0 ? cookieSecret : undefined));
    app.use((0, request_context_middleware_1.requestContextMiddleware)(({ req, res, requestId, traceparent, startedAt, userId, shopId }) => {
        httpLogger.log(JSON.stringify({
            event: 'http_request',
            requestId,
            traceparent,
            method: req.method,
            path: req.originalUrl ?? req.url,
            statusCode: res.statusCode,
            latencyMs: Date.now() - startedAt,
            userId,
            shopId,
        }));
    }));
    app.enableCors(corsOptions());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    const reflector = app.get(core_1.Reflector);
    app.useGlobalInterceptors(new deprecation_interceptor_1.DeprecationInterceptor(reflector), new response_envelope_interceptor_1.ResponseEnvelopeInterceptor(reflector));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('SoftdigitIMS API')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('refresh')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
    const host = process.env.API_HOST?.trim() || '0.0.0.0';
    await app.listen(port, host);
    httpLogger.log(`API listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    httpLogger.log(JSON.stringify({
        event: 'app_startup',
        commitSha: process.env.APP_COMMIT_SHA ?? 'unknown',
        buildTime: process.env.APP_BUILD_TIME ?? 'unknown',
        version: process.env.APP_VERSION ?? process.env.npm_package_version ?? 'unknown',
        nodeEnv: process.env.NODE_ENV ?? 'unknown',
        port,
    }));
}
bootstrap();
//# sourceMappingURL=main.js.map