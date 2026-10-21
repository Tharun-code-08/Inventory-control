import { NotificationCommandService } from './notification-command.service';

describe('NotificationCommandService.detect', () => {
  const service = new NotificationCommandService({} as never);

  it.each([
    ['stop daily summary', 'disable_daily'],
    ['please turn off all notifications', 'disable_all'],
    ['resume low stock alerts', 'enable_low_stock'],
    ['disable overdue reminders', 'disable_overdue'],
    ['enable notifications', 'enable_all'],
    ['my notifications', 'status'],
  ])('recognises "%s"', (text, type) => {
    expect(service.detect(text)).toEqual({ type });
  });

  it.each([
    'why is there no stock alert for SKU-1?',
    'send the notifications report to Ravi',
    'no, show me the daily sales',
    'can you stop the PO for ACME and send an alert to the supplier',
  ])('ignores ordinary message "%s"', (text) => {
    expect(service.detect(text)).toBeNull();
  });
});
