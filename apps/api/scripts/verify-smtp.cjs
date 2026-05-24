/**
 * Verify Zoho SMTP for office@softdigitconsulting.com.
 * Usage (from apps/api): node scripts/verify-smtp.cjs [--send test@example.com]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 587);
const secure = process.env.SMTP_SECURE === 'true';
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.MAIL_FROM || user;
const sendTo = process.argv.includes('--send') ? process.argv[process.argv.indexOf('--send') + 1] : null;

async function main() {
  if (!host || !user || !pass) {
    console.error('Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in apps/api/.env');
    process.exit(1);
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2', servername: host },
  });

  await transport.verify();
  console.log(`SMTP OK — ${host}:${port} as ${user} (from ${from})`);

  if (sendTo) {
    const info = await transport.sendMail({
      from: `"Softdigit Consulting" <${from}>`,
      to: sendTo,
      subject: 'Retail IMS — SMTP test',
      text: `Test email from ${from} via ${host}.`,
      html: `<p>Test email from <strong>${from}</strong> via ${host}.</p>`,
    });
    console.log(`Test email sent to ${sendTo} (messageId=${info.messageId ?? 'n/a'})`);
  }
}

main().catch((err) => {
  console.error('SMTP failed:', err.message);
  process.exit(1);
});
