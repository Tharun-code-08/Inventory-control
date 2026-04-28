import { PartialType } from '@nestjs/swagger';
import { CreateStorageLocationDto } from './create-storage-location.dto';

export class UpdateStorageLocationDto extends PartialType(CreateStorageLocationDto) {}

