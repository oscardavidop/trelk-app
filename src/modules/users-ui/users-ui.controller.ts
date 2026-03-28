// src/users-ui/users-ui.controller.ts
// API-only controller — returns pure JSON for the React SPA frontend
import { Controller, Get, Patch, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { UsersUiService } from './users-ui.service';
import { UserService } from '../users/user.service';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

const ADMIN_IDS = new Set(
    (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean),
);

@Controller('api/v1/ui')
@UseGuards(CookieAuthGuard)
export class AjaxUsersUiController {

    private readonly ADMIN_IDS: Set<number>;

    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) { 
        this.ADMIN_IDS = new Set(
            (this.configService.get<string>('ADMIN_IDS') || '').split(',').map(Number).filter(Boolean),
        );
    }

    @Get('me')
    async getMe(@Req() req: any) {
        const user = req.user;
        // req.user viene de CookieStrategy: { authUser: {...}, authTelegram: {...} }
        const userId = user.authTelegram?.id
            || user.authUser?.telegramId
            || user.authUser?.id
            || user.authUser?._id;

            console.log('[getMe] userId:', userId, this.ADMIN_IDS, 'isAdmin:', this.ADMIN_IDS.has(Number(userId)));
        return {
            ok: true,
            user: {
                id: userId,
                telegram: user.authTelegram,
                profile: user.authUser,
                isAdmin: this.ADMIN_IDS.has(Number(userId)),
            },
        };
    }

    /** GET /api/v1/ui/user/config — lightweight user config payload */
    @Get('user/config')
    async getUserConfig(@Req() req: any) {
        const telegramId = this.extractTelegramId(req);
        const data = await this.userService.getFullConfig(telegramId);
        if (!data) {
            return { ok: false, error: 'User not found' };
        }

        return {
            ok: true,
            ...(data.config || { commands: {} }),
        };
    }

    @Get(':userId')
    async getUserHome(@Param('userId') userId: string, @Req() req: any) {
        const user = req.user;
        return {
            ok: true,
            user: {
                id: user.id || user._id,
                telegram: user.authTelegram,
                profile: user.authUser,
            },
        };
    }

    @Get(':userId/settings')
    async getSettings(@Param('userId') userId: string, @Req() req: any) {
        const user = req.user;
        return {
            ok: true,
            settings: user.authUser || {},
        };
    }

    @Get(':userId/profile')
    async getProfile(@Param('userId') userId: string, @Req() req: any) {
        const user = req.user;
        return {
            ok: true,
            telegram: user.authTelegram,
            profile: user.authUser,
        };
    }

    /** PATCH /api/v1/ui/profile — update user profile fields */
    @Patch('profile')
    async updateProfile(@Req() req: any, @Body() body: Record<string, any>) {
        const telegramId = this.extractTelegramId(req);

        const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'city'];
        const MAX_LEN = 120;
        const updates: Record<string, string> = {};

        for (const key of ALLOWED_FIELDS) {
            if (body[key] !== undefined) {
                const val = String(body[key]).trim().slice(0, MAX_LEN);
                updates[key] = val;
            }
        }

        if (Object.keys(updates).length === 0) {
            throw new BadRequestException('No valid fields provided');
        }

        await this.userService.updateProfileFields(telegramId, updates);
        return { ok: true };
    }

    private extractTelegramId(req: any): number {
        const user = req.user;
        return (
            user.authTelegram?.id ||
            user.authUser?.telegramId ||
            user.authUser?.id
        );
    }
}