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

const RULES: Array<{ pattern: RegExp; command: NotifCommand }> = [
  {
    pattern:
      /\b(stop|disable|turn\s*off|no|don'?t\s*send)\b.{0,30}\b(all\s+notifications?|all\s+alerts?|all\s+updates?|notifications?|alerts?)\b/i,
    command: { type: 'disable_all' },
  },
  {
    pattern:
      /\b(enable|turn\s*on|start|resume|send)\b.{0,30}\b(all\s+notifications?|notifications?|all\s+alerts?|all\s+updates?)\b/i,
    command: { type: 'enable_all' },
  },
  {
    pattern:
      /\b(stop|disable|turn\s*off|no|don'?t\s*send)\b.{0,30}\b(daily\s+summary|daily\s+(updates?|report|snapshots?)|daily)\b/i,
    command: { type: 'disable_daily' },
  },
  {
    pattern:
      /\b(enable|turn\s*on|start|resume)\b.{0,30}\b(daily\s+summary|daily\s+(updates?|report|snapshots?)|daily)\b/i,
    command: { type: 'enable_daily' },
  },
  {
    pattern:
      /\b(stop|disable|turn\s*off|no|don'?t\s*send)\b.{0,30}\b(low[\s-]?stock\s+alerts?|stock\s+alerts?)\b/i,
    command: { type: 'disable_low_stock' },
  },
  {
    pattern:
      /\b(enable|turn\s*on|start|resume)\b.{0,30}\b(low[\s-]?stock\s+alerts?|stock\s+alerts?)\b/i,
    command: { type: 'enable_low_stock' },
  },
  {
    pattern:
      /\b(stop|disable|turn\s*off|no|don'?t\s*send)\b.{0,30}\b(overdue|payment\s+reminders?|invoice\s+alerts?)\b/i,
    command: { type: 'disable_overdue' },
  },
  {
    pattern:
      /\b(enable|turn\s*on|start|resume)\b.{0,30}\b(overdue|payment\s+reminders?|invoice\s+alerts?)\b/i,
    command: { type: 'enable_overdue' },
  },
  {
    pattern:
      /\b(notification\s+settings?|my\s+notifications?|alert\s+settings?|what\s+notifications?|which\s+notifications?)\b/i,
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
