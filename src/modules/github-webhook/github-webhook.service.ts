import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommandReport, CommandReportDocument } from '../reports/schemas/command-report.schema';
import { ReportEvent, ReportEventDocument } from '../reports/schemas/report-event.schema';
import { NotificationEventBus } from '../notifications/notification-event-bus';

@Injectable()
export class GithubWebhookService {
  private readonly logger = new Logger(GithubWebhookService.name);

  constructor(
    @InjectModel(CommandReport.name) private readonly reportModel: Model<CommandReportDocument>,
    @InjectModel(ReportEvent.name) private readonly eventModel: Model<ReportEventDocument>,
    private readonly eventBus: NotificationEventBus,
  ) {}

  async processWebhook(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'issues':
        await this.handleIssueEvent(payload);
        break;
      case 'issue_comment':
        await this.handleCommentEvent(payload);
        break;
      default:
        this.logger.debug(`Ignoring event: ${event}`);
    }
  }

  // ════════════════════════════════════════════════
  // ISSUE EVENTS
  // ════════════════════════════════════════════════

  private async handleIssueEvent(payload: any) {
    const issue = payload.issue;
    if (!issue?.number) return;

    const report = await this.findReportByIssue(issue.number, issue.html_url);
    if (!report) {
      this.logger.debug(`No report found for issue #${issue.number}, ignoring`);
      return;
    }

    const action = payload.action as string;
    const actor = this.extractActor(payload.sender);
    const reportId = report._id as Types.ObjectId;

    // ── Save event ──
    await this.createEvent({
      reportId,
      githubIssueNumber: issue.number,
      type: 'issue',
      action: this.mapIssueAction(action),
      actor,
      content: this.getIssueEventContent(action, payload),
      metadata: this.getIssueEventMetadata(action, payload),
    });

    // ── Update report state ──
    const update: Record<string, unknown> = {};

    if (action === 'closed') {
      update.status = 'closed';
      update.githubState = 'closed';
    } else if (action === 'reopened') {
      update.status = 'open';
      update.githubState = 'open';
    } else if (action === 'labeled' || action === 'unlabeled') {
      update.githubLabels = (issue.labels || []).map((l: any) => l.name);
    } else if (action === 'assigned' || action === 'unassigned') {
      update.githubAssignees = (issue.assignees || []).map((a: any) => a.login);
    } else if (action === 'edited') {
      // State might change on edit, sync it
      update.githubState = issue.state;
    }

    if (Object.keys(update).length > 0) {
      await this.reportModel.updateOne({ _id: reportId }, { $set: update });
    }

    // ── Notify user ──
    await this.notifyUser(report, action, actor, payload);
  }

  // ════════════════════════════════════════════════
  // COMMENT EVENTS
  // ════════════════════════════════════════════════

  private async handleCommentEvent(payload: any) {
    const issue = payload.issue;
    const comment = payload.comment;
    if (!issue?.number || !comment) return;

    const report = await this.findReportByIssue(issue.number, issue.html_url);
    if (!report) {
      this.logger.debug(`No report found for issue #${issue.number}, ignoring comment`);
      return;
    }

    const action = payload.action as string;
    const actor = this.extractActor(comment.user);
    const reportId = report._id as Types.ObjectId;

    const actionMap: Record<string, string> = {
      created: 'commented',
      edited: 'comment_edited',
      deleted: 'comment_deleted',
    };

    await this.createEvent({
      reportId,
      githubIssueNumber: issue.number,
      type: 'comment',
      action: actionMap[action] || action,
      actor,
      content: action !== 'deleted' ? this.sanitizeContent(comment.body) : undefined,
      metadata: { commentId: comment.id, commentUrl: comment.html_url },
    });

    // ── Notify on new comment only ──
    if (action === 'created') {
      const userId = String(report.userId);
      this.eventBus.emit('report.comment', {
        userId,
        reportId: reportId.toString(),
        command: report.command,
        actor: actor.username,
        content: this.truncate(comment.body, 100),
      }).catch((e) => this.logger.warn(`Notification emit error: ${(e as Error).message}`));
    }
  }

  // ════════════════════════════════════════════════
  // TIMELINE QUERY
  // ════════════════════════════════════════════════

  async getTimeline(reportId: string, limit = 50, before?: number) {
    const filter: Record<string, unknown> = {
      reportId: new Types.ObjectId(reportId),
    };
    if (before) {
      filter.createdAt = { $lt: before };
    }

    const events = await this.eventModel
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()
      .exec();

    return {
      items: events.map((e) => ({
        id: (e as any)._id.toString(),
        type: e.type,
        action: e.action,
        actor: e.actor,
        content: e.content,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
      hasMore: events.length === limit,
    };
  }

  // ════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════

  private async findReportByIssue(issueNumber: number, issueUrl?: string) {
    // Primary: lookup by issue number (set by worker on creation)
    const byNumber = await this.reportModel.findOne({ githubIssueNumber: issueNumber }).lean().exec();
    if (byNumber) return byNumber;

    // Fallback: match by githubIssueUrl for legacy reports created before the number field was added
    if (issueUrl) {
      const byUrl = await this.reportModel.findOne({ githubIssueUrl: issueUrl }).lean().exec();
      if (byUrl) {
        // Backfill the issue number for future lookups
        await this.reportModel.updateOne({ _id: byUrl._id }, { $set: { githubIssueNumber: issueNumber } });
        return byUrl;
      }
    }
    return null;
  }

  private async createEvent(data: {
    reportId: Types.ObjectId;
    githubIssueNumber: number;
    type: string;
    action: string;
    actor: { username: string; avatarUrl: string };
    content?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.eventModel.create({
      ...data,
      createdAt: Date.now(),
    });
  }

  private extractActor(user: any): { username: string; avatarUrl: string } {
    return {
      username: user?.login || 'unknown',
      avatarUrl: user?.avatar_url || '',
    };
  }

  private mapIssueAction(action: string): string {
    const map: Record<string, string> = {
      opened: 'opened',
      closed: 'closed',
      reopened: 'reopened',
      edited: 'edited',
      assigned: 'assigned',
      unassigned: 'unassigned',
      labeled: 'labeled',
      unlabeled: 'unlabeled',
    };
    return map[action] || action;
  }

  private getIssueEventContent(action: string, payload: any): string | undefined {
    if (action === 'assigned' || action === 'unassigned') {
      return payload.assignee?.login;
    }
    if (action === 'labeled' || action === 'unlabeled') {
      return payload.label?.name;
    }
    return undefined;
  }

  private getIssueEventMetadata(action: string, payload: any): Record<string, unknown> | undefined {
    if (action === 'labeled' || action === 'unlabeled') {
      return { label: payload.label?.name, labelColor: payload.label?.color };
    }
    if (action === 'assigned' || action === 'unassigned') {
      return { assignee: payload.assignee?.login, assigneeAvatar: payload.assignee?.avatar_url };
    }
    return undefined;
  }

  private async notifyUser(report: any, action: string, actor: { username: string }, payload: any) {
    const userId = String(report.userId);
    const reportId = (report._id as Types.ObjectId).toString();

    if (action === 'closed') {
      await this.eventBus.emit('report.closed', {
        userId,
        reportId,
        command: report.command,
      });
    } else if (action === 'assigned') {
      await this.eventBus.emit('report.assigned', {
        userId,
        reportId,
        command: report.command,
        assignee: payload.assignee?.login || 'someone',
      });
    } else if (action === 'reopened') {
      await this.eventBus.emit('report.reopened', {
        userId,
        reportId,
        command: report.command,
      });
    } else if (action === 'labeled') {
      const label = payload.label?.name;
      if (label && ['in-progress', 'wontfix', 'duplicate'].includes(label)) {
        await this.eventBus.emit('report.labeled', {
          userId,
          reportId,
          command: report.command,
          label,
        });
      }
    }
  }

  private sanitizeContent(body: string): string {
    if (!body) return '';
    // Strip HTML but keep markdown
    return body.replace(/<[^>]*>/g, '').slice(0, 2000);
  }

  private truncate(text: string, max: number): string {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }
}
