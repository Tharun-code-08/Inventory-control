import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
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
  list(@CurrentUser() user: RequestUser) {
    return this.users.list(user);
  }

  @RequirePermission('user:manage')
  @Get('roles/list')
  listRoles() {
    return this.users.listRoles();
  }

  @RequirePermission('user:manage')
  @Patch('roles/:roleName/permissions')
  updateRolePermissions(
    @CurrentUser() user: RequestUser,
    @Param('roleName') roleName: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.users.updateRolePermissions(user, roleName, dto.permissions);
  }

  @RequirePermission('user:manage')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @RequirePermission('user:manage')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.users.get(user, id);
  }

  @RequirePermission('user:manage')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, id, dto);
  }

  @RequirePermission('user:manage')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.users.remove(user, id);
  }
}
