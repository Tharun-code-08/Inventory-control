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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_customer_dto_1 = require("./dto/create-customer.dto");
const list_customers_dto_1 = require("./dto/list-customers.dto");
const update_customer_dto_1 = require("./dto/update-customer.dto");
const customers_service_1 = require("./customers.service");
let CustomersController = class CustomersController {
    customers;
    constructor(customers) {
        this.customers = customers;
    }
    list(user, query) {
        return this.customers.list(user, query);
    }
    create(user, dto) {
        return this.customers.create(user, dto);
    }
    get(user, id) {
        return this.customers.get(user, id);
    }
    update(user, id, dto) {
        return this.customers.update(user, id, dto);
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List customers (paginated, shop-scoped)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_customers_dto_1.ListCustomersDto]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_customer_dto_1.CreateCustomerDto]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a customer by id' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_customer_dto_1.UpdateCustomerDto]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "update", null);
exports.CustomersController = CustomersController = __decorate([
    (0, swagger_1.ApiTags)('customers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('customers'),
    __metadata("design:paramtypes", [customers_service_1.CustomersService])
], CustomersController);
//# sourceMappingURL=customers.controller.js.map