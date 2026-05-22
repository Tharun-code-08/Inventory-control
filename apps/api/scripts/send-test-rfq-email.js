require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || 'office@softdigitconsulting.com';
  const to = process.argv[2] || 'thangavel@gmail.com';

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
  });

  await transport.verify();
  const info = await transport.sendMail({
    from,
    to,
    subject: 'Retail IMS RFQ portal test',
    text: 'Test email from Retail IMS RFQ invite flow.',
    html: '<p>Test email from <strong>Retail IMS</strong> RFQ invite flow.</p>',
  });
  console.log('Sent:', info.messageId, 'to', to);
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
