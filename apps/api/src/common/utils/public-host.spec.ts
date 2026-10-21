import { assertPublicSmtpTarget, isPrivateAddress } from './public-host';

describe('isPrivateAddress', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.20.0.5', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])(
    'flags %s',
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );

  it.each(['8.8.8.8', '142.250.1.108', '2607:f8b0::1'])('allows %s', (ip) => expect(isPrivateAddress(ip)).toBe(false));
});

describe('assertPublicSmtpTarget', () => {
  it('rejects non-mail ports', async () => {
    await expect(assertPublicSmtpTarget('8.8.8.8', 6379)).rejects.toThrow('SMTP port');
  });

  it('rejects private literal addresses', async () => {
    await expect(assertPublicSmtpTarget('127.0.0.1', 587)).rejects.toThrow('public mail server');
  });

  it('accepts a public address on a mail port', async () => {
    await expect(assertPublicSmtpTarget('8.8.8.8', 587)).resolves.toBeUndefined();
  });
});
