"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateShopDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_shop_dto_1 = require("./create-shop.dto");
class UpdateShopDto extends (0, swagger_1.PartialType)(create_shop_dto_1.CreateShopDto) {
}
exports.UpdateShopDto = UpdateShopDto;
//# sourceMappingURL=update-shop.dto.js.map