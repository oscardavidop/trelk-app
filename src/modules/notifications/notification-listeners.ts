import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationEventBus } from './notification-event-bus';
import { NotificationService, CreateNotificationPayload } from './notification.service';

/**
 * Registers all notification event listeners.
 * Each event maps to a specific notification type with i18n keys.
 */
@Injectable()
export class NotificationListeners implements OnModuleInit {
  private readonly logger = new Logger(NotificationListeners.name);

  constructor(
    private readonly eventBus: NotificationEventBus,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit() {
    this.registerAll();
    this.logger.log('All notification listeners registered');
  }

  private registerAll() {
    this.eventBus.on('achievement.unlocked', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'achievement_unlocked',
        titleKey: 'achievement_unlocked_title',
        messageKey: 'achievement_unlocked_msg',
        messageParams: { name: data.achievementName },
        data: { achievementId: data.achievementId },
        priority: 'normal',
        link: data.link as string | undefined,
      });
    });

    this.eventBus.on('review.rejected', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'review_rejected',
        titleKey: 'review_rejected_title',
        messageKey: 'review_rejected_msg',
        messageParams: { command: data.command },
        data: { commandSlug: data.command, reviewId: data.reviewId },
        priority: 'high',
        link: `/users/ui/${userId}/bot-commands/${data.command}`,
      });
    });

    this.eventBus.on('review.approved', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'review_approved',
        titleKey: 'review_approved_title',
        messageKey: 'review_approved_msg',
        messageParams: { command: data.command },
        data: { commandSlug: data.command, reviewId: data.reviewId },
        priority: 'normal',
        link: `/users/ui/${userId}/bot-commands/${data.command}?highlight=review`,
      });
    });

    this.eventBus.on('command.trending', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'command_trending',
        titleKey: 'command_trending_title',
        messageKey: 'command_trending_msg',
        messageParams: { command: data.command },
        data: { commandSlug: data.command },
        priority: 'low',
      });
    });

    this.eventBus.on('user.level_up', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'user_level_up',
        titleKey: 'user_level_up_title',
        messageKey: 'user_level_up_msg',
        messageParams: { level: data.level },
        data: { level: data.level, xp: data.xp },
        priority: 'normal',
        link: `/users/ui/${userId}/profile-tab`,
      });
    });

    this.eventBus.on('system.announcement', async (data) => {
      const userIds = data.userIds as string[] | undefined;
      if (userIds && userIds.length > 0) {
        await this.notificationService.createBulkNotifications(userIds, {
          type: 'system_alert',
          titleKey: 'system_alert_title',
          messageKey: 'system_alert_msg',
          messageParams: { message: data.message },
          data: data.extra as Record<string, unknown> | undefined,
          priority: 'high',
        });
      }
    });

    this.eventBus.on('report.resolved', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'report_resolved',
        titleKey: 'report_resolved_title',
        messageKey: 'report_resolved_msg',
        messageParams: { command: data.command },
        data: { reportId: data.reportId },
        priority: 'normal',
      });
    });

    this.eventBus.on('ai.summary_updated', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'ai_summary_updated',
        titleKey: 'ai_summary_updated_title',
        messageKey: 'ai_summary_updated_msg',
        messageParams: { command: data.command },
        data: { commandSlug: data.command },
        priority: 'low',
      });
    });

    this.eventBus.on('user.inactivity', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'inactivity_reminder',
        titleKey: 'inactivity_reminder_title',
        messageKey: 'inactivity_reminder_msg',
        messageParams: { days: data.days },
        priority: 'low',
      });
    });

    this.eventBus.on('user.weekly_recap', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'weekly_stats',
        titleKey: 'weekly_recap_title',
        messageKey: 'weekly_recap_msg',
        messageParams: {
          commands: data.commandsThisWeek,
          trend: data.commandsTrend,
        },
        data: {
          commandsThisWeek: data.commandsThisWeek,
          topCommand: data.topCommand,
        },
        priority: 'low',
        link: `/users/ui/${userId}/home`,
      });
    });

    this.eventBus.on('command.new_relevant', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'new_command',
        titleKey: 'new_relevant_command_title',
        messageKey: 'new_relevant_command_msg',
        messageParams: { command: data.command },
        data: { commandSlug: data.command },
        priority: 'normal',
        link: `/users/ui/${userId}/bot-commands/${data.command}`,
      });
    });

    // ── GitHub webhook events ──

    this.eventBus.on('report.closed', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'report_resolved',
        titleKey: 'report_closed_title',
        messageKey: 'report_closed_msg',
        messageParams: { command: data.command },
        data: { reportId: data.reportId },
        priority: 'normal',
        link: `/users/ui/${userId}/my-reports?report=${data.reportId}`,
      });
    });

    this.eventBus.on('report.comment', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'report_comment',
        titleKey: 'report_new_comment_title',
        messageKey: 'report_new_comment_msg',
        messageParams: { actor: data.actor, command: data.command },
        data: { reportId: data.reportId, content: data.content },
        priority: 'normal',
        link: `/users/ui/${userId}/my-reports?report=${data.reportId}&event=last`,
      });
    });

    this.eventBus.on('report.assigned', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'report_assigned',
        titleKey: 'report_assigned_title',
        messageKey: 'report_assigned_msg',
        messageParams: { user: data.assignee, command: data.command },
        data: { reportId: data.reportId },
        priority: 'low',
        link: `/users/ui/${userId}/my-reports?report=${data.reportId}`,
      });
    });

    this.eventBus.on('report.reopened', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'report_reopened',
        titleKey: 'report_reopened_title',
        messageKey: 'report_reopened_msg',
        messageParams: { command: data.command },
        data: { reportId: data.reportId },
        priority: 'normal',
        link: `/users/ui/${userId}/my-reports?report=${data.reportId}`,
      });
    });

    this.eventBus.on('report.labeled', async (data) => {
      const userId = String(data.userId);
      await this.notify(userId, {
        type: 'report_labeled',
        titleKey: 'report_labeled_title',
        messageKey: 'report_labeled_msg',
        messageParams: { label: data.label, command: data.command },
        data: { reportId: data.reportId, label: data.label },
        priority: 'low',
        link: `/users/ui/${userId}/my-reports?report=${data.reportId}`,
      });
    });
  }

  private async notify(
    userId: string,
    payload: CreateNotificationPayload,
  ): Promise<void> {
    try {
      await this.notificationService.createNotification(userId, payload);
    } catch (err) {
      this.logger.error(
        `Failed to create notification for user ${userId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
