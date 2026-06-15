import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getLive() {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMB: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      },
      nodeVersion: process.version,
      pid: process.pid,
    };
  }

  async getReady() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
      };
    } catch {
      return {
        status: 'not_ready',
        database: 'disconnected',
      };
    }
  }
}
