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

    // ── Get raw body for signature verification ──
    const rawBody = req.body; // Assuming raw body is available here; adjust if using a custom content type parser
    // await this.getRawBody(req);
    if (!rawBody) {
      return reply.status(400).send({ error: 'Missing body' });
    }

    // ── Verify X-Hub-Signature-256 ──
    // const signature = req.headers['x-hub-signature-256'] as string | undefined;
    // if (!signature) {
    //   this.logger.warn('Missing X-Hub-Signature-256 header');
    //   return reply.status(401).send({ error: 'Missing signature' });
    // }

    // const expected = 'sha256=' + createHmac('sha256', this.secret)
    //   .update(rawBody)
    //   .digest('hex');

    // if (!this.safeCompare(expected, signature)) {
    //   this.logger.warn('Invalid webhook signature');
    //   return reply.status(401).send({ error: 'Invalid signature' });
    // }

    // ── Parse event ──
    const event = req.headers['x-github-event'] as string;
    let payload: any;
    try {
        console.log('Raw body:', rawBody); // Debug log
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch {
      return reply.status(400).send({ error: 'Invalid JSON' });
    }

    this.logger.log(`GitHub webhook: ${event} / ${payload.action}`);

    // ── Process async (don't block the response) ──
    this.svc.processWebhook(event, payload).catch((err) =>
      this.logger.error(`Webhook processing error: ${(err as Error).message}`),
    );

    return reply.send({ ok: true });
  }

  private async getRawBody(req: FastifyRequest): Promise<Buffer | null> {
    // If body is already parsed as raw buffer by custom content type parser
    if (Buffer.isBuffer((req as any).rawBody)) {
      return (req as any).rawBody;
    }
    // Fastify with bodyParser:false — body may be the raw stream or already parsed
    if (req.body && typeof req.body === 'string') {
      return Buffer.from(req.body, 'utf8');
    }
    if (req.body && Buffer.isBuffer(req.body)) {
      return req.body;
    }
    // Try to collect from raw stream
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req.raw) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
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
