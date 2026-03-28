import { Injectable, Logger } from '@nestjs/common';

export type NotificationEventType =
  | 'achievement.unlocked'
  | 'review.rejected'
  | 'review.approved'
  | 'command.trending'
  | 'user.level_up'
  | 'system.announcement'
  | 'report.resolved'
  | 'report.closed'
  | 'report.comment'
  | 'report.assigned'
  | 'report.reopened'
  | 'report.labeled'
  | 'ai.summary_updated'
  | 'user.inactivity'
  | 'user.weekly_recap'
  | 'command.new_relevant';

type EventHandler = (data: Record<string, unknown>) => void | Promise<void>;

@Injectable()
export class NotificationEventBus {
  private readonly logger = new Logger(NotificationEventBus.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  on(event: NotificationEventType, handler: EventHandler): void {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
    this.logger.log(`Listener registered for "${event}"`);
  }

  async emit(event: NotificationEventType, data: Record<string, unknown>): Promise<void> {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) {
      this.logger.debug(`No handlers for event "${event}"`);
      return;
    }

    for (const handler of list) {
      try {
        await handler(data);
      } catch (err) {
        this.logger.error(
          `Handler error for event "${event}": ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
