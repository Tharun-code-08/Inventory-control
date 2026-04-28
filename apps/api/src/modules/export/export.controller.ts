import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';

@ApiTags('export')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(
    @InjectQueue('exports') private readonly exportsQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  @Get('status/:jobId')
  async status(@Param('jobId') jobId: string) {
    const job = await this.exportsQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    const state = await job.getState();
    const result = job.returnvalue as { downloadUrl?: string; fileName?: string } | undefined;
    return { status: state, downloadUrl: result?.downloadUrl, fileName: result?.fileName };
  }

  @SkipEnvelope()
  @Get('files/:fileName')
  async file(@Param('fileName') fileName: string, @Res() res: Response) {
    const safe = path.basename(fileName);
    const dir = this.config.get<string>('EXPORT_STORAGE_DIR', './storage/exports');
    const full = path.join(dir, safe);
    try {
      await fs.access(full);
    } catch {
      throw new NotFoundException('File not found');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
    return createReadStream(full).pipe(res);
  }
}
