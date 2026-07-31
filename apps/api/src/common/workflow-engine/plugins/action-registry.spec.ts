import { ActionRegistry, ActionContext, WebhookAction } from './action-registry';

const ctx: ActionContext = { companyId: 'co', invoiceId: 'inv', invoiceNumber: 'INV-1', balanceDue: 1000 };

describe('ActionRegistry', () => {
  const reg = new ActionRegistry();

  it('registers built-in actions', () => {
    expect(reg.has('webhook')).toBe(true);
    expect(reg.has('notify.customer')).toBe(true);
    expect(reg.has('approval')).toBe(true);
    expect(reg.has('crm.update')).toBe(true);
  });

  it('treats notify.customer as routed via the dispatch pipeline', async () => {
    const res = await reg.execute({ type: 'notify.customer', tone: 'firm' }, ctx);
    expect(res.performed).toBe(true);
    expect(res.detail).toMatch(/dispatch pipeline/);
  });

  it('reports deferred integrations as not performed', async () => {
    const res = await reg.execute({ type: 'crm.update' }, ctx);
    expect(res.performed).toBe(false);
    expect(res.detail).toMatch(/deferred/);
  });

  it('returns a safe no-op for an unregistered action', async () => {
    const res = await reg.execute({ type: 'nope' }, ctx);
    expect(res.performed).toBe(false);
    expect(res.detail).toMatch(/no action registered/);
  });

  it('signals approval as awaiting a human decision', async () => {
    const res = await reg.execute({ type: 'approval' }, ctx);
    expect(res.performed).toBe(true);
    expect(res.detail).toMatch(/awaiting human/);
  });
});

describe('WebhookAction', () => {
  const action = new WebhookAction();
  const origFetch = global.fetch;
  afterEach(() => {
    global.fetch = origFetch;
  });

  it('does nothing when no url is configured', async () => {
    const res = await action.execute(ctx, {});
    expect(res.performed).toBe(false);
    expect(res.detail).toMatch(/no url/);
  });

  it('POSTs to the configured url and reports success', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as never;
    const res = await action.execute(ctx, { url: 'https://hook.test/x' });
    expect(res.performed).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://hook.test/x', expect.objectContaining({ method: 'POST' }));
  });

  it('degrades to not-performed (never throws) on a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;
    const res = await action.execute(ctx, { url: 'https://hook.test/x' });
    expect(res.performed).toBe(false);
    expect(res.detail).toMatch(/ECONNREFUSED/);
  });
});
