"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPRECATED_KEY = void 0;
exports.Deprecated = Deprecated;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
exports.DEPRECATED_KEY = 'http:deprecated';
function Deprecated(meta) {
    const summarySuffix = meta.link ? ` (see ${meta.link})` : '';
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(exports.DEPRECATED_KEY, meta), (0, swagger_1.ApiOperation)({
        deprecated: true,
        description: `Deprecated. Sunset on ${meta.sunsetAt}.${meta.note ? ` ${meta.note}` : ''}${summarySuffix}`,
    }));
}
//# sourceMappingURL=deprecated.decorator.js.map