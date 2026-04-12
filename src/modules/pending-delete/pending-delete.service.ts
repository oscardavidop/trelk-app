import {
  Injectable, Logger, NotFoundException, BadRequestException,
  OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';

const DEFAULT_DELAY_MS = 6000;

export interface PendingDeletePayload {
  entity: string;
  ids: string[];
  userId: number;
  deleteAll: boolean;
}

@Injectable()
export class PendingDeleteService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PendingDeleteService.name);
  private queue: Queue<PendingDeletePayload> | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Returns true if the system is in "aware" (backend-managed undo) mode */
  get isAwareMode(): boolean {
    const mode = this.config.get<string>('UNDO_MODE', 'aware');
    return mode !== 'persistent';
  }

  async onModuleInit() {
    try {
      const host = this.config.get<string>('REDIS_HOST', 'localhost');
      const port = this.config.get<number>('REDIS_PORT', 6379);
      const password = this.config.get<string>('REDIS_PASSWORD', '') || undefined;
      const tls = this.config.get<string>('REDIS_TLS') === 'true';


      this.queue = new Queue<PendingDeletePayload>('finalize-delete', {
        connection: { host, port, password, maxRetriesPerRequest: null, tls: tls ? {} : undefined },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 200 },
        },
      });

      this.logger.log('Pending-delete queue initialized');
    } catch (err) {
      this.logger.error(`Failed to init pending-delete queue: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.queue) await this.queue.close();
  }

  /**
   * Mark specific documents as pending_delete and schedule a delayed finalization job.
   */
  async schedule<T>(
    entity: string,
    model: Model<T>,
    ids: string[],
    userId: number,
    delayMs = DEFAULT_DELAY_MS,
  ): Promise<{ expiresAt: number; jobId: string; count: number }> {
    if (!ids.length) throw new BadRequestException('No ids provided');

    const expiresAt = Date.now() + delayMs;
    const jobId = `pd_${entity}_${userId}_${Date.now()}`;

    const result = await model.updateMany(
      { _id: { $in: ids }, userId } as any,
      { $set: { status: 'pending_delete', pendingDeleteAt: expiresAt, deleteJobId: jobId } } as any,
    );

    if (this.queue && result.modifiedCount > 0) {
      await this.queue.add(
        'finalize_delete',
        { entity, ids, userId, deleteAll: false },
        { delay: delayMs, jobId },
      );
    }

    return { expiresAt, jobId, count: result.modifiedCount };
  }

  /**
   * Mark ALL matching documents as pending_delete and schedule a delayed finalization job.
   */
  async scheduleAll<T>(
    entity: string,
    model: Model<T>,
    userId: number,
    filter: Record<string, any> = {},
    delayMs = DEFAULT_DELAY_MS,
  ): Promise<{ expiresAt: number; jobId: string; count: number }> {
    const expiresAt = Date.now() + delayMs;
    const jobId = `pd_${entity}_all_${userId}_${Date.now()}`;

    const result = await model.updateMany(
      { ...filter, userId, status: { $ne: 'pending_delete' } } as any,
      { $set: { status: 'pending_delete', pendingDeleteAt: expiresAt, deleteJobId: jobId } } as any,
    );

    if (this.queue && result.modifiedCount > 0) {
      await this.queue.add(
        'finalize_delete',
        { entity, ids: [], userId, deleteAll: true },
        { delay: delayMs, jobId },
      );
    }

    return { expiresAt, jobId, count: result.modifiedCount };
  }

  /**
   * Immediately hard-delete documents (for persistent/frontend-only undo mode).
   */
  async hardDelete<T>(
    model: Model<T>,
    ids: string[],
    userId: number,
  ): Promise<{ count: number }> {
    if (!ids.length) throw new BadRequestException('No ids provided');
    const result = await model.deleteMany(
      { _id: { $in: ids }, userId } as any,
    );
    return { count: result.deletedCount };
  }

  /**
   * Cancel pending_delete for specific IDs (undo single/batch).
   */
  async cancel<T>(
    model: Model<T>,
    ids: string[],
    userId: number,
  ): Promise<{ restored: number }> {
    const docs = await model.find(
      { _id: { $in: ids }, userId, status: 'pending_delete' } as any,
    ).select('deleteJobId pendingDeleteAt').lean().exec() as any[];

    if (docs.length === 0) throw new NotFoundException('No pending items found');

    const now = Date.now();
    if (docs.every((d: any) => d.pendingDeleteAt && d.pendingDeleteAt <= now)) {
      throw new BadRequestException('Undo period has expired');
    }

    const result = await model.updateMany(
      { _id: { $in: ids }, userId, status: 'pending_delete' } as any,
      { $set: { status: 'active' }, $unset: { pendingDeleteAt: '', deleteJobId: '' } } as any,
    );

    const jobIds = [...new Set(docs.map((d: any) => d.deleteJobId).filter(Boolean))];
    await this.cancelJobs(jobIds);

    return { restored: result.modifiedCount };
  }

  /**
   * Cancel pending_delete for ALL entries with a specific jobId (undo "delete all").
   */
  async cancelByJobId<T>(
    model: Model<T>,
    jobId: string,
    userId: number,
  ): Promise<{ restored: number }> {
    const result = await model.updateMany(
      { userId, status: 'pending_delete', deleteJobId: jobId } as any,
      { $set: { status: 'active' }, $unset: { pendingDeleteAt: '', deleteJobId: '' } } as any,
    );

    if (result.modifiedCount === 0) {
      throw new NotFoundException('No pending items found or undo period expired');
    }

    await this.cancelJobs([jobId]);

    return { restored: result.modifiedCount };
  }

  private async cancelJobs(jobIds: string[]) {
    if (!this.queue) return;
    for (const jid of jobIds) {
      try {
        const job = await this.queue.getJob(jid);
        if (job) await job.remove();
      } catch { /* job may already be processed */ }
    }
  }
}
