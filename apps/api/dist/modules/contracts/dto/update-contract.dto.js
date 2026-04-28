"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateContractDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_contract_dto_1 = require("./create-contract.dto");
class UpdateContractDto extends (0, swagger_1.PartialType)(create_contract_dto_1.CreateContractDto) {
}
exports.UpdateContractDto = UpdateContractDto;
//# sourceMappingURL=update-contract.dto.js.map