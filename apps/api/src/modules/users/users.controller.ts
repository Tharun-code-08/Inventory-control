import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermission('user:manage')
  @Get()
  list() {
    return this.users.list();
  }

  @RequirePermission('user:manage')
  @Get('roles/list')
  listRoles() {
    return this.users.listRoles();
  }

  @RequirePermission('user:manage')
  @Patch('roles/:roleName/permissions')
  updateRolePermissions(@Param('roleName') roleName: string, @Body() dto: UpdateRolePermissionsDto) {
    return this.users.updateRolePermissions(roleName, dto.permissions);
  }

  @RequirePermission('user:manage')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @RequirePermission('user:manage')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @RequirePermission('user:manage')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @RequirePermission('user:manage')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
