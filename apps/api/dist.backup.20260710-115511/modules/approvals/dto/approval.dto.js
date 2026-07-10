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
exports.ApprovalFilterDto = exports.ApprovalListResponseDto = exports.ApprovalCommentResponseDto = exports.AddApprovalCommentDto = exports.RejectApprovalDto = exports.ApproveApprovalDto = exports.ApprovalRequestResponseDto = exports.CreateApprovalRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateApprovalRequestDto {
    approvalType;
    referenceId;
    assignedTo;
    documentNumber;
    amount;
    description;
    requiredAt;
}
exports.CreateApprovalRequestDto = CreateApprovalRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.ApprovalType,
        description: 'Type of approval required',
        example: 'GOODS_RECEIPT',
    }),
    (0, class_validator_1.IsEnum)(client_1.ApprovalType),
    __metadata("design:type", String)
], CreateApprovalRequestDto.prototype, "approvalType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the entity requiring approval',
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateApprovalRequestDto.prototype, "referenceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID of the approver',
        example: '550e8400-e29b-41d4-a716-446655440001',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateApprovalRequestDto.prototype, "assignedTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Document number (e.g., GR-001, PO-001)',
        example: 'GR-2024-001',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateApprovalRequestDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount for approval (for high-value transactions)',
        example: 50000.00,
        required: false,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateApprovalRequestDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of approval request',
        example: 'Please approve the goods receipt for order PO-001',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateApprovalRequestDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When approval is required by',
        example: '2024-06-15T18:00:00Z',
        required: false,
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateApprovalRequestDto.prototype, "requiredAt", void 0);
class ApprovalRequestResponseDto {
    id;
    companyId;
    requestedBy;
    assignedTo;
    approvalType;
    referenceId;
    status;
    documentNumber;
    amount;
    description;
    rejectionReason;
    approvedAt;
    rejectedAt;
    requiredAt;
    createdAt;
    updatedAt;
}
exports.ApprovalRequestResponseDto = ApprovalRequestResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalRequestResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalRequestResponseDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalRequestResponseDto.prototype, "requestedBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalRequestResponseDto.prototype, "assignedTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ApprovalType }),
    __metadata("design:type", String)
], ApprovalRequestResponseDto.prototype, "approvalType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalRequestResponseDto.prototype, "referenceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ApprovalStatus }),
    __metadata("design:type", String)
], ApprovalRequestResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], ApprovalRequestResponseDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: 'number', required: false, nullable: true }),
    __metadata("design:type", Object)
], ApprovalRequestResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], ApprovalRequestResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], ApprovalRequestResponseDto.prototype, "rejectionReason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], ApprovalRequestResponseDto.prototype, "approvedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], ApprovalRequestResponseDto.prototype, "rejectedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], ApprovalRequestResponseDto.prototype, "requiredAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ApprovalRequestResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ApprovalRequestResponseDto.prototype, "updatedAt", void 0);
class ApproveApprovalDto {
    comment;
}
exports.ApproveApprovalDto = ApproveApprovalDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Comment on approval',
        example: 'Looks good. Items match the PO.',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApproveApprovalDto.prototype, "comment", void 0);
class RejectApprovalDto {
    rejectionReason;
    comment;
}
exports.RejectApprovalDto = RejectApprovalDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for rejection',
        example: 'Quantity mismatch with original PO',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectApprovalDto.prototype, "rejectionReason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Additional comment',
        example: 'Please resubmit with corrected quantities',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RejectApprovalDto.prototype, "comment", void 0);
class AddApprovalCommentDto {
    comment;
}
exports.AddApprovalCommentDto = AddApprovalCommentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Comment text',
        example: 'Need more information about the supplier',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddApprovalCommentDto.prototype, "comment", void 0);
class ApprovalCommentResponseDto {
    id;
    approvalId;
    userId;
    comment;
    createdAt;
}
exports.ApprovalCommentResponseDto = ApprovalCommentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalCommentResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalCommentResponseDto.prototype, "approvalId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalCommentResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ApprovalCommentResponseDto.prototype, "comment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ApprovalCommentResponseDto.prototype, "createdAt", void 0);
class ApprovalListResponseDto {
    data;
    total;
    pendingCount;
    page;
    limit;
    hasMore;
}
exports.ApprovalListResponseDto = ApprovalListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ApprovalRequestResponseDto] }),
    __metadata("design:type", Array)
], ApprovalListResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ApprovalListResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ApprovalListResponseDto.prototype, "pendingCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ApprovalListResponseDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ApprovalListResponseDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ApprovalListResponseDto.prototype, "hasMore", void 0);
class ApprovalFilterDto {
    status;
    approvalType;
    page = 1;
    limit = 20;
    sortBy = 'createdAt';
    sortOrder = 'desc';
}
exports.ApprovalFilterDto = ApprovalFilterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.ApprovalStatus,
        description: 'Filter by approval status',
        required: false,
    }),
    (0, class_validator_1.IsEnum)(client_1.ApprovalStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApprovalFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.ApprovalType,
        description: 'Filter by approval type',
        required: false,
    }),
    (0, class_validator_1.IsEnum)(client_1.ApprovalType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApprovalFilterDto.prototype, "approvalType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Pagination: page number',
        required: false,
        default: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ApprovalFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Pagination: items per page',
        required: false,
        default: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ApprovalFilterDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Sort by field',
        required: false,
        enum: ['createdAt', 'requiredAt', 'amount'],
        default: 'createdAt',
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApprovalFilterDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Sort order',
        required: false,
        enum: ['asc', 'desc'],
        default: 'desc',
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApprovalFilterDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=approval.dto.js.map