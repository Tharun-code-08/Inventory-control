import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { returnImageMulterOptions } from '../../common/upload/return-image-multer.options';
import { CreateCustomerReturnDto } from './dto/create-customer-return.dto';
import { CreateSupplierReturnDto } from './dto/create-supplier-return.dto';
import { UpdateSupplierReturnDto } from './dto/update-supplier-return.dto';
import { UploadSupplierReturnImageDto } from './dto/upload-supplier-return-image.dto';
import { ReturnsService } from './returns.service';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Get('customer')
  @RequirePermission('shop:read')
  @ApiOperation({ summary: 'List customer returns' })
  listCustomer(@CurrentUser() user: RequestUser) {
    return this.service.listCustomerReturns(user);
  }

  @Post('customer')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Create a customer return (DRAFT)' })
  createCustomer(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCustomerReturnDto,
  ) {
    return this.service.createCustomerReturn(user, dto);
  }

  @Post('customer/:id/post')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Post a customer return: stock back-in + credit note' })
  postCustomer(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.postCustomerReturn(user, id);
  }

  @Get('supplier')
  @RequirePermission('shop:read')
  @ApiOperation({ summary: 'List supplier returns' })
  listSupplier(@CurrentUser() user: RequestUser) {
    return this.service.listSupplierReturns(user);
  }

  @Get('supplier/:id')
  @RequirePermission('shop:read')
  @ApiOperation({ summary: 'Get supplier return detail' })
  getSupplier(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.getSupplierReturn(user, id);
  }

  @Post('supplier')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Create a supplier return (DRAFT)' })
  createSupplier(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSupplierReturnDto,
  ) {
    return this.service.createSupplierReturn(user, dto);
  }

  @Patch('supplier/:id')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Update a supplier return draft' })
  updateSupplier(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSupplierReturnDto,
  ) {
    return this.service.updateSupplierReturn(user, id, dto);
  }

  @Post('supplier/:id/images')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Upload a supplier return image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        returnItemId: { type: 'string', format: 'uuid', nullable: true },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', returnImageMulterOptions))
  uploadSupplierImage(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UploadSupplierReturnImageDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadSupplierReturnImage(user, id, dto, file);
  }

  @Delete('supplier/:id/images/:imageId')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Delete a supplier return image' })
  deleteSupplierImage(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('imageId', new ParseUUIDPipe()) imageId: string,
  ) {
    return this.service.removeSupplierReturnImage(user, id, imageId);
  }

  @Post('supplier/:id/submit')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Submit supplier return and send acknowledgement email' })
  submitSupplier(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.submitSupplierReturn(user, id);
  }

  @Post('supplier/:id/send')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Resend supplier return notice email (with PDF and images)' })
  sendSupplier(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('resend') resend?: string,
  ) {
    return this.service.sendSupplierReturnNotice(user, id, { resend: resend === 'true' });
  }

  @Post('supplier/:id/acknowledge')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Manually accept/acknowledge a submitted supplier return and post stock' })
  acknowledgeSupplier(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.manuallyAcknowledgeSupplierReturn(user, id);
  }

  @Post('supplier/:id/cancel')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Cancel a supplier return' })
  cancelSupplier(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.cancelSupplierReturn(user, id);
  }

  @Post('supplier/:id/post')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Legacy supplier return posting endpoint' })
  postSupplier(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.postSupplierReturn(user, id);
  }

  @Public()
  @Get('supplier/public/:token')
  @ApiOperation({ summary: 'Public supplier return acknowledgement preview' })
  getSupplierPublic(@Param('token') token: string) {
    return this.service.getSupplierReturnPublic(token);
  }

  @Public()
  @Post('supplier/public/:token/acknowledge')
  @ApiOperation({ summary: 'Public supplier acknowledgement for a return notice' })
  acknowledgeSupplierPublic(@Param('token') token: string) {
    return this.service.acknowledgeSupplierReturn(token);
  }
}
