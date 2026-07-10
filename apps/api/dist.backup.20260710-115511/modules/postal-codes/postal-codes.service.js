"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostalCodesService = void 0;
const common_1 = require("@nestjs/common");
const POSTAL_CODE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
function normalizeLocationText(value) {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ');
}
function resolveCity(office) {
    return (normalizeLocationText(office.District) ||
        normalizeLocationText(office.Block) ||
        normalizeLocationText(office.Name));
}
let PostalCodesService = class PostalCodesService {
    cache = new Map();
    async lookup(postalCodeInput) {
        const postalCode = this.normalizePostalCode(postalCodeInput);
        const cached = this.cache.get(postalCode);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        let response;
        try {
            response = await fetch(`https://api.postalpincode.in/pincode/${postalCode}`, {
                signal: AbortSignal.timeout(5_000),
            });
        }
        catch {
            throw new common_1.BadGatewayException('Postal code lookup is unavailable right now.');
        }
        if (!response.ok) {
            throw new common_1.BadGatewayException('Postal code lookup is unavailable right now.');
        }
        const payload = (await response.json());
        const data = this.parseLookupResponse(payload, postalCode);
        this.cache.set(postalCode, {
            value: data,
            expiresAt: Date.now() + POSTAL_CODE_CACHE_TTL_MS,
        });
        return data;
    }
    normalizePostalCode(value) {
        const digits = String(value ?? '').replace(/\D/g, '').slice(0, 6);
        if (digits.length !== 6) {
            throw new common_1.BadRequestException('Enter a valid 6-digit postal code.');
        }
        return digits;
    }
    parseLookupResponse(payload, postalCode) {
        const rows = Array.isArray(payload) ? payload : [payload];
        const match = rows.find((row) => String(row?.Status ?? '').toUpperCase() === 'SUCCESS' &&
            Array.isArray(row?.PostOffice) &&
            row.PostOffice.length > 0);
        const office = match?.PostOffice?.find((item) => Boolean(resolveCity(item)) && Boolean(normalizeLocationText(item.State)));
        if (!office) {
            throw new common_1.NotFoundException('No city found for that postal code.');
        }
        const city = resolveCity(office);
        const state = normalizeLocationText(office.State);
        const country = normalizeLocationText(office.Country) || 'India';
        return {
            postalCode,
            city,
            district: normalizeLocationText(office.District) || city,
            state,
            country,
        };
    }
};
exports.PostalCodesService = PostalCodesService;
exports.PostalCodesService = PostalCodesService = __decorate([
    (0, common_1.Injectable)()
], PostalCodesService);
//# sourceMappingURL=postal-codes.service.js.map