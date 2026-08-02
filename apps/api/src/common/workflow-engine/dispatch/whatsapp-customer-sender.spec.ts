import { WhatsAppCustomerSender } from './whatsapp-customer-sender';
import { CustomerSendRequest } from './customer-message-sender';

const request = (over: Partial<CustomerSendRequest> = {}): CustomerSendRequest => ({
  companyId: 'co',
  customerId: 'cust',
  channel: 'WHATSAPP',
  tone: 'friendly',
  invoiceNumber: 'INV-42',
  balanceDue: 12500,
  address: '919812345678',
  ...over,
});

function makeSender(opts: {
  configured?: boolean;
  env?: Record<string, string>;
  sendTemplate?: jest.Mock;
}) {
  const adapter = {
    isConfigured: jest.fn().mockReturnValue(opts.configured ?? true),
    sendTemplate: opts.sendTemplate ?? jest.fn().mockResolvedValue({ providerMessageId: 'wamid.123' }),
  };
  const config = { get: (k: string) => (opts.env ?? {})[k] };
  const sender = new WhatsAppCustomerSender(adapter as never, config as never);
  return { sender, adapter };
}

describe('WhatsAppCustomerSender', () => {
  const env = { WHATSAPP_DUNNING_TEMPLATE: 'dunning_generic', WHATSAPP_DUNNING_TEMPLATE_LANG: 'en' };

  it('does not send for non-WhatsApp channels (ledger-only)', async () => {
    const { sender, adapter } = makeSender({ env });
    const res = await sender.send(request({ channel: 'EMAIL' }));
    expect(res.sent).toBe(false);
    expect(adapter.sendTemplate).not.toHaveBeenCalled();
  });

  it('does not send when the customer has no WhatsApp number', async () => {
    const { sender } = makeSender({ env });
    const res = await sender.send(request({ address: undefined }));
    expect(res.sent).toBe(false);
    expect(res.detail).toMatch(/no opted-in WhatsApp number/);
  });

  it('does not send when the adapter is unconfigured', async () => {
    const { sender } = makeSender({ env, configured: false });
    const res = await sender.send(request());
    expect(res.sent).toBe(false);
    expect(res.detail).toMatch(/not configured/);
  });

  it('does not send when no approved template is configured', async () => {
    const { sender } = makeSender({ env: {} });
    const res = await sender.send(request());
    expect(res.sent).toBe(false);
    expect(res.detail).toMatch(/no approved template/);
  });

  it('sends via sendTemplate and returns the provider message id', async () => {
    const sendTemplate = jest.fn().mockResolvedValue({ providerMessageId: 'wamid.abc' });
    const { sender } = makeSender({ env, sendTemplate });
    const res = await sender.send(request());
    expect(res.sent).toBe(true);
    expect(res.providerMessageId).toBe('wamid.abc');
    const arg = sendTemplate.mock.calls[0][0];
    expect(arg.to).toBe('919812345678');
    expect(arg.name).toBe('dunning_generic');
    expect(arg.components[0].parameters[0].text).toBe('INV-42');
  });

  it('prefers a tone-specific template over the generic fallback', async () => {
    const sendTemplate = jest.fn().mockResolvedValue({ providerMessageId: 'x' });
    const { sender } = makeSender({
      env: { ...env, WHATSAPP_DUNNING_TEMPLATE_FINAL: 'dunning_final_notice' },
      sendTemplate,
    });
    await sender.send(request({ tone: 'final' }));
    expect(sendTemplate.mock.calls[0][0].name).toBe('dunning_final_notice');
  });

  it('degrades to not-sent (never throws) on a provider error', async () => {
    const sendTemplate = jest.fn().mockRejectedValue(new Error('Meta send failed (131047)'));
    const { sender } = makeSender({ env, sendTemplate });
    const res = await sender.send(request());
    expect(res.sent).toBe(false);
    expect(res.detail).toMatch(/whatsapp send failed/);
  });
});
