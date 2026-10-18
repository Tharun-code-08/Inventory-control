import { EmailCustomerSender } from './email-customer-sender';
import { CustomerSendRequest } from './customer-message-sender';

const request = (over: Partial<CustomerSendRequest> = {}): CustomerSendRequest => ({
  companyId: 'co',
  customerId: 'cust',
  channel: 'EMAIL',
  tone: 'reminder',
  invoiceNumber: 'INV-7',
  balanceDue: 8400,
  address: 'buyer@acme.test',
  ...over,
});

const resolvedSender = {
  senderId: 's1',
  fromEmail: 'billing@tenant.test',
  fromName: 'Tenant Billing',
  replyTo: 'billing@tenant.test',
  smtp: { host: 'smtp.tenant.test', port: 587, secure: false, user: 'u', password: 'p' },
};

function makeSender(opts: { resolve?: jest.Mock; sendViaSmtp?: jest.Mock } = {}) {
  const senders = { resolveTenantSender: opts.resolve ?? jest.fn().mockResolvedValue(resolvedSender) };
  const mail = { sendViaSmtp: opts.sendViaSmtp ?? jest.fn().mockResolvedValue({ messageId: '<abc@tenant>' }) };
  return { sender: new EmailCustomerSender(senders as never, mail as never), senders, mail };
}

describe('EmailCustomerSender', () => {
  it('does not send for non-Email channels', async () => {
    const { sender, mail } = makeSender();
    const res = await sender.send(request({ channel: 'WHATSAPP' }));
    expect(res.sent).toBe(false);
    expect(mail.sendViaSmtp).not.toHaveBeenCalled();
  });

  it('does not send when the customer has no email address', async () => {
    const { sender } = makeSender();
    const res = await sender.send(request({ address: undefined }));
    expect(res.sent).toBe(false);
    expect(res.detail).toMatch(/no opted-in email/);
  });

  it('degrades to ledger-only when no verified primary sender is configured', async () => {
    const resolve = jest.fn().mockRejectedValue(new Error('Configure and verify a sender email'));
    const { sender, mail } = makeSender({ resolve });
    const res = await sender.send(request());
    expect(res.sent).toBe(false);
    expect(res.detail).toMatch(/Configure and verify/);
    expect(mail.sendViaSmtp).not.toHaveBeenCalled();
  });

  it('sends via the tenant SMTP sender and returns the message id', async () => {
    const sendViaSmtp = jest.fn().mockResolvedValue({ messageId: '<xyz@tenant>' });
    const { sender } = makeSender({ sendViaSmtp });
    const res = await sender.send(request({ tone: 'final' }));
    expect(res.sent).toBe(true);
    expect(res.providerMessageId).toBe('<xyz@tenant>');
    const arg = sendViaSmtp.mock.calls[0][1];
    expect(arg.to).toBe('buyer@acme.test');
    expect(arg.fromEmail).toBe('billing@tenant.test');
    expect(arg.subject).toMatch(/INV-7/);
    expect(arg.subject).toMatch(/Final payment notice/);
  });

  it('degrades to not-sent (never throws) on an SMTP error', async () => {
    const sendViaSmtp = jest.fn().mockRejectedValue(new Error('535 auth failed'));
    const { sender } = makeSender({ sendViaSmtp });
    const res = await sender.send(request());
    expect(res.sent).toBe(false);
    expect(res.detail).toMatch(/email send failed/);
  });
});
