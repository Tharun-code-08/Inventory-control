import { CompositeCustomerSender } from './composite-customer-sender';
import { CustomerSendRequest } from './customer-message-sender';

const request = (channel: CustomerSendRequest['channel']): CustomerSendRequest => ({
  companyId: 'co',
  customerId: 'cust',
  channel,
  tone: 'reminder',
  invoiceNumber: 'INV-1',
  balanceDue: 100,
});

describe('CompositeCustomerSender', () => {
  const whatsapp = { send: jest.fn().mockResolvedValue({ sent: true, providerMessageId: 'wa', detail: 'wa' }) };
  const email = { send: jest.fn().mockResolvedValue({ sent: true, providerMessageId: 'em', detail: 'em' }) };
  const composite = new CompositeCustomerSender(whatsapp as never, email as never);

  afterEach(() => jest.clearAllMocks());

  it('routes WhatsApp to the WhatsApp sender', async () => {
    const res = await composite.send(request('WHATSAPP'));
    expect(whatsapp.send).toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
    expect(res.providerMessageId).toBe('wa');
  });

  it('routes Email to the Email sender', async () => {
    const res = await composite.send(request('EMAIL'));
    expect(email.send).toHaveBeenCalled();
    expect(whatsapp.send).not.toHaveBeenCalled();
    expect(res.providerMessageId).toBe('em');
  });

  it('degrades to ledger-only for unbound channels', async () => {
    const res = await composite.send(request('IN_APP' as never));
    expect(res.sent).toBe(false);
    expect(whatsapp.send).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });
});
