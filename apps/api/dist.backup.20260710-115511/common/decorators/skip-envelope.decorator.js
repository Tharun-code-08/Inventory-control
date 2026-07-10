"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipEnvelope = exports.SKIP_ENVELOPE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_ENVELOPE_KEY = 'skipEnvelope';
const SkipEnvelope = () => (0, common_1.SetMetadata)(exports.SKIP_ENVELOPE_KEY, true);
exports.SkipEnvelope = SkipEnvelope;
//# sourceMappingURL=skip-envelope.decorator.js.map