import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { InsufficientStockException } from '../exceptions/domain.exceptions';

function fakeHost(): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method: 'POST', originalUrl: '/x', headers: {}, requestId: 'req-1' };
  const host: ArgumentsHost = {
    switchToHttp: () =>
      ({
        getResponse: () => response,
        getRequest: () => request,
      }) as unknown as ReturnType<ArgumentsHost['switchToHttp']>,
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    // Filter logs at error level for unhandled errors; silence to keep test output clean.
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
  });

  it('returns 422 + INSUFFICIENT_STOCK for InsufficientStockException', () => {
    const { host, status, json } = fakeHost();
    filter.catch(
      new InsufficientStockException('not enough stock', [
        { productId: 'p1', productCode: 'P-1', available: '0', requested: '1' },
      ]),
      host,
    );
    expect(status).toHaveBeenCalledWith(422);
    expect(json.mock.calls[0][0].error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('passes through HttpException status & message', () => {
    const { host, status, json } = fakeHost();
    filter.catch(new BadRequestException('bad'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error.message).toBe('bad');
  });

  it('maps Prisma P2002 to 409 with friendly message for email conflicts', () => {
    const err = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 't',
      meta: { target: ['email'] },
    });
    const { host, status, json } = fakeHost();
    filter.catch(err, host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json.mock.calls[0][0].error.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
    expect(json.mock.calls[0][0].error.message).toMatch(/email/i);
  });

  it('maps idempotency_key collisions to a friendly message', () => {
    const err = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 't',
      meta: { target: ['idempotency_key'] },
    });
    const { host, json } = fakeHost();
    filter.catch(err, host);
    expect(json.mock.calls[0][0].error.message).toMatch(/idempotency/i);
  });

  it('maps Prisma P2025 to 404 RECORD_NOT_FOUND', () => {
    const err = new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: 't',
      meta: { cause: 'No record matched' },
    });
    const { host, status, json } = fakeHost();
    filter.catch(err, host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0].error.code).toBe('RECORD_NOT_FOUND');
    expect(json.mock.calls[0][0].error.message).toBe('No record matched');
  });

  it('maps Prisma P2003 to 409 FK violation', () => {
    const err = new Prisma.PrismaClientKnownRequestError('fk', {
      code: 'P2003',
      clientVersion: 't',
      meta: { field_name: 'shop_id' },
    });
    const { host, status, json } = fakeHost();
    filter.catch(err, host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json.mock.calls[0][0].error.code).toBe('FOREIGN_KEY_CONSTRAINT_VIOLATION');
  });

  it('maps Prisma P2014 to 400 RELATION_VIOLATION', () => {
    const err = new Prisma.PrismaClientKnownRequestError('rel', {
      code: 'P2014',
      clientVersion: 't',
    });
    const { host, status, json } = fakeHost();
    filter.catch(err, host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error.code).toBe('RELATION_VIOLATION');
  });

  it('maps PrismaClientValidationError to 400', () => {
    const { host, status, json } = fakeHost();
    filter.catch(new Prisma.PrismaClientValidationError('bad payload', { clientVersion: 't' }), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error.code).toBe('VALIDATION_ERROR');
  });

  it('maps INSUFFICIENT_STOCK_DB raised by trigger to 422', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      'something INSUFFICIENT_STOCK_DB happened',
      { code: 'P0001', clientVersion: 't' },
    );
    const { host, status, json } = fakeHost();
    filter.catch(err, host);
    expect(status).toHaveBeenCalledWith(422);
    expect(json.mock.calls[0][0].error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('falls back to 500 INTERNAL_ERROR for unknown errors and hides details by default', () => {
    delete process.env.APP_DEBUG;
    const { host, status, json } = fakeHost();
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json.mock.calls[0][0].error.code).toBe('INTERNAL_ERROR');
    expect(json.mock.calls[0][0].error.message).toBe('An unexpected error occurred');
    expect(json.mock.calls[0][0].error.details).toBeUndefined();
  });

  it('exposes the message and stack snippet when APP_DEBUG=true', () => {
    process.env.APP_DEBUG = 'true';
    try {
      const { host, json } = fakeHost();
      filter.catch(new Error('boom'), host);
      expect(json.mock.calls[0][0].error.message).toBe('boom');
      expect(json.mock.calls[0][0].error.details).toBeDefined();
    } finally {
      delete process.env.APP_DEBUG;
    }
  });

  it('passes a 404 NotFoundException through unchanged', () => {
    const { host, status, json } = fakeHost();
    filter.catch(new NotFoundException('gone'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0].error.message).toBe('gone');
  });
});
