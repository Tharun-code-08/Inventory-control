import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackupProvider } from '@prisma/client';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { Public } from '../../common/decorators/public.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { BackupService } from './backup.service';

@ApiTags('backups')
@ApiBearerAuth()
@Controller('backups')
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  @Get('status')
  status(@CurrentUser() user: RequestUser) {
    return this.backup.getStatus(user);
  }

  @Get('artifacts')
  listArtifacts(@CurrentUser() user: RequestUser) {
    return this.backup.listArtifacts(user);
  }

  @Post('jobs')
  createJob(@CurrentUser() user: RequestUser, @Body() body: { provider?: 'MANUAL' | 'GOOGLE_DRIVE' }) {
    const provider =
      body?.provider === 'GOOGLE_DRIVE' ? BackupProvider.GOOGLE_DRIVE : BackupProvider.MANUAL;
    return this.backup.createBackupJob(user, provider);
  }

  @Get('google/connect')
  googleConnect(@CurrentUser() user: RequestUser) {
    return this.backup.buildGoogleConnectUrl(user);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    await this.backup.completeGoogleConnect(code, state);
    return res.redirect(this.backup.googleRedirectSuccessUrl());
  }

  @Delete('google/connect')
  disconnectGoogle(@CurrentUser() user: RequestUser) {
    return this.backup.disconnectGoogle(user);
  }

  @Post('artifacts/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    }),
  )
  uploadArtifact(@CurrentUser() user: RequestUser, @UploadedFile() file: Express.Multer.File) {
    return this.backup.saveUploadedArtifact(user, file);
  }

  @SkipEnvelope()
  @Get('artifacts/:id/download')
  async downloadArtifact(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const artifact = await this.backup.getArtifactDownloadPath(user, id);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    return createReadStream(artifact.storagePath).pipe(res);
  }

  @Post('restore/dry-run')
  dryRun(@CurrentUser() user: RequestUser, @Body() body: { artifactId: string }) {
    return this.backup.dryRunRestore(user, body.artifactId);
  }

  @Post('restore/apply')
  apply(
    @CurrentUser() user: RequestUser,
    @Body() body: { restoreJobId: string; confirmationToken: string },
  ) {
    return this.backup.applyRestore(user, body.restoreJobId, body.confirmationToken);
  }
}
