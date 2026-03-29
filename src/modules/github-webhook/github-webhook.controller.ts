import {
  Controller, Post, Req, Res, Logger, HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { GithubWebhookService } from './github-webhook.service';

@Controller('api/v1/integrations/github')
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name);
  private readonly secret: string;

  constructor(
    private readonly svc: GithubWebhookService,
    private readonly config: ConfigService,
  ) {
    this.secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET', '');
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    if (!this.secret) {
      this.logger.warn('GITHUB_WEBHOOK_SECRET not configured, rejecting webhook');
      return reply.status(503).send({ error: 'Webhook not configured' });
    }

    // ── Raw body is captured by our custom JSON content-type parser in main.ts ──
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (!rawBody || rawBody.length === 0) {
      this.logger.warn('No raw body available for signature verification');
      return reply.status(400).send({ error: 'Missing body' });
    }

    // ── Verify X-Hub-Signature-256 ──
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!signature) {
      this.logger.warn('Missing X-Hub-Signature-256 header');
      return reply.status(401).send({ error: 'Missing signature' });
    }

    const expected = 'sha256=' + createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex');

    if (!this.safeCompare(expected, signature)) {
      this.logger.warn('Invalid webhook signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // ── Body is already parsed by Fastify's JSON parser ──
    const event = req.headers['x-github-event'] as string;
    const payload = req.body as Record<string, any>;

    if (!event || !payload) {
      return reply.status(400).send({ error: 'Missing event or payload' });
    }

    this.logger.log(`GitHub webhook: ${event} / ${payload.action ?? 'n/a'}`);

    // ── Process async (don't block GitHub's response) ──
    this.svc.processWebhook(event, payload).catch((err) =>
      this.logger.error(`Webhook processing error: ${(err as Error).message}`),
    );

    return reply.send({ ok: true });
  }

  private safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
