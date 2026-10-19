import { requestContextMiddleware } from './request-context.middleware';

function run(headers: Record<string, string | undefined>) {
  const res = { setHeader: jest.fn(), on: jest.fn() } as never;
  const req = { headers, ip: '127.0.0.1' } as never;
  requestContextMiddleware()(req, res, () => undefined);
  return { req: req as { requestId?: string } };
}

describe('requestContextMiddleware request id', () => {
  const uuid = '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b';

  it('keeps a well-formed UUID supplied by the client', () => {
    const { req } = run({ 'x-request-id': uuid });
    expect(req.requestId).toBe(uuid);
  });

  it('replaces a non-UUID value (the outbox correlation id is a uuid column)', () => {
    const { req } = run({ 'x-request-id': 'mobile-1700000000-abc' });
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(req.requestId).not.toBe('mobile-1700000000-abc');
  });
});
