import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { brandingMulterOptions } from '../../common/branding/branding-multer.options';
import { UpdateBrandingProfileDto } from '../../common/branding/dto/update-branding-profile.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @RequirePermission('company:read')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.companies.list(user);
  }

  @RequirePermission('company:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCompanyDto) {
    return this.companies.create(user, dto);
  }

  @RequirePermission('company:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.companies.get(user, id);
  }

  @RequirePermission('company:write')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(user, id, dto);
  }

  @RequirePermission('company:write')
  @Patch(':id/branding')
  @UseInterceptors(FileInterceptor('logo', brandingMulterOptions))
  updateBranding(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBrandingProfileDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.companies.updateBranding(user, id, dto, logo);
  }

  @RequirePermission('company:read')
  @Get(':id/branding')
  getBranding(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.companies.getBranding(user, id);
  }

  @RequirePermission('company:write')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.companies.remove(user, id);
  }
}
