import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES = 3;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Injectable()
export class ReportUploadService {
  private readonly logger = new Logger(ReportUploadService.name);
  private readonly octokit: Octokit | null;
  private readonly owner: string;
  private readonly repo: string;
  private readonly uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('GITHUB_TOKEN', '');
    const repoFull = this.configService.get<string>('GITHUB_UPLOADS_REPO', '');
    this.uploadPath = 'uploads/report-screenshots';

    if (token && repoFull) {
      this.octokit = new Octokit({ auth: token });
      const [owner, repo] = repoFull.split('/');
      this.owner = owner || '';
      this.repo = repo || '';
    } else {
      this.octokit = null;
      this.owner = '';
      this.repo = '';
    }
  }

  async saveFiles(
    files: Array<{ filename: string; mimetype: string; data: Buffer }>,
  ): Promise<string[]> {
    if (files.length > MAX_FILES) {
      throw new BadRequestException(`Maximum ${MAX_FILES} screenshots allowed`);
    }

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMES.join(', ')}`,
        );
      }
      if (file.data.length > MAX_FILE_SIZE) {
        throw new BadRequestException(`File "${file.filename}" exceeds 2MB limit`);
      }

      const ext = file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : file.mimetype.split('/')[1];
      const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

      const url = await this.uploadToGithub(name, file.data);
      if (url) {
        urls.push(url);
      } else {
        this.logger.warn(`Failed to upload screenshot ${name}, skipping`);
      }
    }

    this.logger.log(`Uploaded ${urls.length} report screenshot(s) to GitHub`);
    return urls;
  }

  private async uploadToGithub(filename: string, data: Buffer): Promise<string | null> {
    if (!this.octokit) {
      this.logger.warn('GitHub not configured, cannot upload screenshot');
      return null;
    }

    const path = `${this.uploadPath}/${filename}`;
    const content = data.toString('base64');

    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: `chore: upload report screenshot ${filename}`,
        content,
      });

      // Return the raw.githubusercontent.com URL for direct image access
      return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/${path}`;
    } catch (err) {
      this.logger.error(`GitHub upload failed: ${(err as Error).message}`);
      return null;
    }
  }
}
