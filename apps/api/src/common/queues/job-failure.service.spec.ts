import type { Job } from 'bullmq';
import { JobFailureService } from './job-failure.service';
import type { PrismaService } from '../../prisma/prisma.service';

function fakePrisma(create: jest.Mock, findFirst: jest.Mock = jest.fn().mockResolvedValue(null)): PrismaService {
  return {
    jobFailure: { create, findFirst },
  } as unknown as PrismaService;
}

function fakeJob(overrides: Partial<Job<unknown>> = {}): Job<unknown> {
  return {
    queueName: 'exports',
    name: 'report-xlsx',
    id: 'job-1',
    data: { foo: 'bar' },
    attemptsMade: 5,
    opts: { attempts: 5 },
    ...overrides,
  } as unknown as Job<unknown>;
}

describe('JobFailureService', () => {
  it('skips persistence when more retries are pending', async () => {
    const create = jest.fn();
    const svc = new JobFailureService(fakePrisma(create));
    await svc.record(fakeJob({ attemptsMade: 1, opts: { attempts: 5 } }), new Error('oops'));
    expect(create).not.toHaveBeenCalled();
  });

  it('persists when attempts are exhausted', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'jf-1' });
    const svc = new JobFailureService(fakePrisma(create));
    await svc.record(fakeJob(), new Error('boom'));
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data.queue).toBe('exports');
    expect(data.jobName).toBe('report-xlsx');
    expect(data.jobId).toBe('job-1');
    expect(data.errorName).toBe('Error');
    expect(data.errorMsg).toBe('boom');
    expect(data.attempts).toBe(5);
    expect(data.data).toEqual({ foo: 'bar' });
  });

  it('treats `attempts: undefined` as 1', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'jf-2' });
    const svc = new JobFailureService(fakePrisma(create));
    await svc.record(fakeJob({ attemptsMade: 1, opts: {} }), new Error('boom'));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('swallows DB errors so the worker is not killed by a logging failure', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const svc = new JobFailureService(fakePrisma(create));
    await expect(svc.record(fakeJob(), new Error('boom'))).resolves.toBeUndefined();
  });

  it('deduplicates repeated terminal failures for the same job/error within the cooldown window', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'jf-4' });
    const findFirst = jest.fn().mockResolvedValue({ id: 'existing' });
    const svc = new JobFailureService(fakePrisma(create, findFirst));
    await svc.record(fakeJob(), new Error('boom'));
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });

  it('truncates very long messages and stacks defensively', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'jf-3' });
    const svc = new JobFailureService(fakePrisma(create));
    const long = 'x'.repeat(10_000);
    const err = new Error(long);
    err.stack = long;
    await svc.record(fakeJob(), err);
    const data = create.mock.calls[0][0].data;
    expect(data.errorMsg.length).toBeLessThanOrEqual(2000);
    expect(data.stack.length).toBeLessThanOrEqual(8000);
  });
});
