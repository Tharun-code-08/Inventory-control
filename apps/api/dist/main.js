"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./load-env");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const cookieParser = require("cookie-parser");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const response_envelope_interceptor_1 = require("./common/interceptors/response-envelope.interceptor");
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
function corsOptions() {
    const allowList = webCorsOrigin();
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
            if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`Origin ${origin} not allowed by CORS`), false);
        },
        credentials: true,
    };
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.enableCors(corsOptions());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    app.useGlobalInterceptors(new response_envelope_interceptor_1.ResponseEnvelopeInterceptor(app.get(core_1.Reflector)));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Retail IMS API')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('refresh')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map