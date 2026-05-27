import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { MailService } from '../../common/mail/mail.service';
import {
  paymentReminderHtml,
  paymentReminderSubject,
  paymentReminderText,
} from '../../common/mail/transactional-email.templates';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailNotificationsService } from './email-notifications.service';
import { PAYMENT_REMINDER_QUEUE } from './payment-reminder.constants';

@Processor(PAYMENT_REMINDER_QUEUE)
export class PaymentReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly emailNotifications: EmailNotificationsService,
  ) {
    super();
  }

  async process(_job: Job) {
    if (!this.mail.isConfigured()) {
      this.logger.warn('Payment reminder job skipped: SMTP not configured');
      return { sent: 0, skipped: 'SMTP not configured' };
    }

    const config = await this.emailNotifications.resolveConfigForShop(null);
    if (!config.reminders.paymentReminderEnabled) {
      return { sent: 0, skipped: 'Reminders disabled' };
    }

    const daysBefore = [...new Set(config.reminders.paymentReminderDaysBefore)].filter(
      (day) => Number.isFinite(day) && day >= 0,
    );
    if (daysBefore.length === 0) return { sent: 0 };

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let sent = 0;

    for (const daysUntilDue of daysBefore) {
      const targetDue = new Date(today);
      targetDue.setUTCDate(targetDue.getUTCDate() + daysUntilDue);

      const invoices = await this.prisma.invoiceHeader.findMany({
        where: {
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
          dueDate: targetDue,
          customer: { email: { not: '' } },
        },
        include: {
          customer: { select: { customerName: true, email: true } },
          shop: { select: { shopName: true, companyId: true, company: { select: { companyName: true } } } },
        },
        take: 200,
      });

      for (const invoice of invoices) {
        const recipient = invoice.customer.email?.trim();
        if (!recipient) continue;

        const templateKey = `payment_reminder_${daysUntilDue}`;
        const alreadySent = await this.emailNotifications.hasDeliveryLog({
          templateId: templateKey,
          entityType: 'invoice',
          entityId: invoice.id,
          recipient,
        });
        if (alreadySent) continue;

        const balance = Number(invoice.totalValue) - Number(invoice.paidValue);
        if (balance <= 0) continue;

        const formatMoney = (value: number) =>
          new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
          }).format(value);

        const content = {
          customerName: invoice.customer.customerName,
          invoiceNumber: invoice.invoiceNumber,
          dueDate: invoice.dueDate
            ? invoice.dueDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '',
          daysUntilDue: String(daysUntilDue),
          balanceDue: formatMoney(balance),
          companyName: invoice.shop?.company?.companyName ?? 'Softdigit Consulting',
        };

        const prepared = this.emailNotifications.prepareTemplate(
          config,
          'payment_reminder',
          {
            subject: paymentReminderSubject(content),
            text: paymentReminderText(content),
            html: paymentReminderHtml(content),
          },
          {
            customer_name: content.customerName,
            invoice_number: content.invoiceNumber,
            due_date: content.dueDate,
            days_until_due: content.daysUntilDue,
            balance_due: content.balanceDue,
            company_name: content.companyName,
          },
        );

        if (!prepared.enabled) continue;

        if (!invoice.shop?.companyId) continue;

        await this.mail.sendTenantMail(invoice.shop.companyId, {
          to: recipient,
          subject: prepared.subject,
          text: prepared.text,
          html: prepared.html,
          cc: prepared.cc,
          bcc: prepared.bcc,
          fromName: content.companyName,
        });

        await this.emailNotifications.logDelivery({
          templateId: templateKey,
          entityType: 'invoice',
          entityId: invoice.id,
          recipient,
        });
        sent += 1;
      }
    }

    return { sent };
  }
}
