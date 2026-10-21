import { Injectable } from '@nestjs/common';
import type { UserChannelLink } from '@prisma/client';
import type { OutboundReply, QuickReply } from '../channels/channel-adapter.interface';
import { NotificationPrefsService } from './notification-prefs.service';

type NotifCommand =
  | { type: 'disable_all' }
  | { type: 'enable_all' }
  | { type: 'disable_daily' }
  | { type: 'enable_daily' }
  | { type: 'disable_low_stock' }
  | { type: 'enable_low_stock' }
  | { type: 'disable_overdue' }
  | { type: 'enable_overdue' }
  | { type: 'status' };

const RESUME_BUTTONS: [QuickReply, QuickReply] = [
  { id: 'snapshot', title: '📊 Snapshot' },
  { id: 'help', title: '❓ Help' },
];

// Commands must start the message ("stop daily summary", "please turn off
// alerts"): unanchored patterns used to rewrite preferences on ordinary
// questions such as "why is there no stock alert for X?".
const LEAD = String.raw`^\s*(?:please\s+|pls\s+|kindly\s+)?`;
const OFF = String.raw`(?:stop|disable|turn\s*off|mute|don'?t\s*send)`;
const ON = String.raw`(?:enable|turn\s*on|start|resume|unmute)`;
const cmd = (verb: string, target: string) =>
  new RegExp(`${LEAD}${verb}\\b(?:\\s+(?:my|the|all))*\\s*${target}\\s*[.!]*\\s*$`, 'i');

const ALL = String.raw`(?:notifications?|alerts?|updates?)`;
const DAILY = String.raw`(?:daily\s+(?:summary|summaries|updates?|reports?|snapshots?))`;
const LOW_STOCK = String.raw`(?:(?:low[\s-]?)?stock\s+alerts?)`;
const OVERDUE = String.raw`(?:overdue(?:\s+(?:payments?|reminders?|alerts?))?|payment\s+reminders?|invoice\s+alerts?)`;

const RULES: Array<{ pattern: RegExp; command: NotifCommand }> = [
  { pattern: cmd(OFF, ALL), command: { type: 'disable_all' } },
  { pattern: cmd(ON, ALL), command: { type: 'enable_all' } },
  { pattern: cmd(OFF, DAILY), command: { type: 'disable_daily' } },
  { pattern: cmd(ON, DAILY), command: { type: 'enable_daily' } },
  { pattern: cmd(OFF, LOW_STOCK), command: { type: 'disable_low_stock' } },
  { pattern: cmd(ON, LOW_STOCK), command: { type: 'enable_low_stock' } },
  { pattern: cmd(OFF, OVERDUE), command: { type: 'disable_overdue' } },
  { pattern: cmd(ON, OVERDUE), command: { type: 'enable_overdue' } },
  {
    pattern: new RegExp(
      `${LEAD}(?:show\\s+)?(?:notification\\s+settings?|my\\s+notifications?|alert\\s+settings?|(?:what|which)\\s+notifications?(?:\\s+(?:am\\s+i|do\\s+i)\\s+(?:getting|subscribed\\s+to|get))?)\\s*\\??\\s*$`,
      'i',
    ),
    command: { type: 'status' },
  },
];

@Injectable()
export class NotificationCommandService {
  constructor(private readonly prefs: NotificationPrefsService) {}

  detect(text: string): NotifCommand | null {
    for (const rule of RULES) {
      if (rule.pattern.test(text)) return rule.command;
    }
    return null;
  }

  async execute(link: UserChannelLink, command: NotifCommand): Promise<OutboundReply> {
    switch (command.type) {
      case 'disable_all':
        await this.prefs.disableAll(link.id);
        return {
          body: '🔕 All notifications turned off. You will no longer receive daily summaries, low-stock alerts, or payment reminders.\n\nReply "enable notifications" to turn them back on.',
          buttons: RESUME_BUTTONS,
        };

      case 'enable_all':
        await this.prefs.enableAll(link.id);
        return {
          body: '🔔 All notifications turned on.\n- 📊 Daily summary\n- 📦 Low stock alerts\n- ⚠️ Overdue payment reminders\n\nReply "notification settings" to see your current preferences.',
          buttons: RESUME_BUTTONS,
        };

      case 'disable_daily':
        await this.prefs.update(link.id, { dailySummary: false });
        return {
          body: '🔕 Daily summaries turned off. You can still ask for a snapshot anytime.',
          buttons: [{ id: 'snapshot', title: '📊 Snapshot' }, { id: 'help', title: '❓ Help' }],
        };

      case 'enable_daily':
        await this.prefs.update(link.id, { dailySummary: true });
        return { body: '🔔 Daily summaries turned on. You\'ll receive a business overview every morning.', buttons: RESUME_BUTTONS };

      case 'disable_low_stock':
        await this.prefs.update(link.id, { lowStock: false });
        return { body: '🔕 Low-stock alerts turned off.', buttons: RESUME_BUTTONS };

      case 'enable_low_stock':
        await this.prefs.update(link.id, { lowStock: true });
        return { body: '🔔 Low-stock alerts turned on. You\'ll be notified when items drop below minimum stock.', buttons: RESUME_BUTTONS };

      case 'disable_overdue':
        await this.prefs.update(link.id, { overduePayment: false });
        return { body: '🔕 Overdue payment reminders turned off.', buttons: RESUME_BUTTONS };

      case 'enable_overdue':
        await this.prefs.update(link.id, { overduePayment: true });
        return { body: '🔔 Overdue payment reminders turned on.', buttons: RESUME_BUTTONS };

      case 'status': {
        const p = this.prefs.getPrefs(link);
        const on = '✅';
        const off = '🔕';
        return {
          body: [
            '*Your notification preferences:*',
            `${p.dailySummary !== false ? on : off} Daily summary`,
            `${p.lowStock !== false ? on : off} Low stock alerts`,
            `${p.overduePayment !== false ? on : off} Overdue payment reminders`,
            '',
            'Reply "stop daily" or "enable notifications" to change.',
          ].join('\n'),
          buttons: RESUME_BUTTONS,
        };
      }
    }
  }
}
