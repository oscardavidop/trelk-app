import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  NotFoundException,
  UseGuards,
  Query,
  ParseIntPipe,
  BadRequestException,
  UseInterceptors,
  Delete,
  Headers,
  Req,
  Res,
  Put,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { User } from "./user.entity";
import { JwtAuthGuard, TelegramAuthGuard } from "../auth/guards/jwt-auth.guard";
// import { UserPublicDto } from "src/modules/users/dto/UserPublicDto";
import { plainToInstance } from "class-transformer";
// import { RateLimit } from "src/common/decorators/ratelimit.decorator";
// import { CurrentUser, CurrentUserId } from "src/common/decorators/current-user.decorator";
import { AuthenticatedUser } from "src/common/custom/interfaces/authuser.interface";
// import { GetLogByIdDto } from "./dto/dtos";
import * as crypto from 'crypto';
import { AuthService } from "../auth/auth.service";
import { DynamicAuthGuard } from "../auth/guards/dynamic.guard";
import { ChangeSettingsDto } from "./dto/api.dto";
import { validate } from 'class-validator';
import { AppError, ErrorCode } from '../../common/errors';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) { }

  @Post('api/users')
  @UseGuards(DynamicAuthGuard)
  async api(@Body() dto: ChangeSettingsDto, @Req() req, @Res({ passthrough: true }) res) {
    let ok = true;
    // Pre-parse JSON strings from x-www-form-urlencoded before class-transformer
    if (typeof dto.settings === 'string') {
      try { dto.settings = JSON.parse(dto.settings); } catch {}
    }
    if (typeof dto.config === 'string') {
      try { dto.config = JSON.parse(dto.config); } catch {}
    }

    const body = plainToInstance(ChangeSettingsDto, dto);
    const errors = await validate(body, {
      whitelist: true,
      stopAtFirstError: true,
    });
    if (errors.length > 0) {
      console.log(JSON.stringify(errors, null, 2));
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid request data', 400, { errors: this.formatErrors(errors) });
    }

    const method = body.method;
    let msg = '';

    switch (method) {
      case 'changeSettings':
        const settingKey = Object.keys(body.settings)[0];

        // Obtener el valor como string
        let settingValue = body.settings[settingKey];

        // Convertir a boolean
        if (settingValue === 'true' || settingValue === '1') {
          settingValue = true;
        } else if (settingValue === 'false' || settingValue === '0') {
          settingValue = false;
        }

        // is array convert object with keys true
        if (Array.isArray(settingValue)) {
          settingValue = settingValue.reduce((acc, curr) => {
            acc[curr] = true;
            return acc;
          }, {});
        }
        if (settingValue === undefined) settingValue = {}

        console.log('datos', {
          userId: req.user.authTelegram.id,
          settingKey,
          settingValue
        })
        const result = await this.userService.updateSetting(req.user.authTelegram.id, settingKey, settingValue);
        msg = `Config '${settingKey}' update to '${settingValue}'`;
      
        if (!result.modifiedCount) {
          msg = `No changes made.`;
        }
        console.log('result', result);

        break;

      case 'updateConfig':
        const r = await this.userService.updateConfig(req.user.authTelegram.id, body.config);
        console.log("Update config result", r, body.config);
        msg = `Changes saved`;
        if (!r.modifiedCount) {
          msg = `No changes made.`;
          ok = false;
        }
        break;

      case 'auth':
        console.log('Auth request received with initData:', req.body.initData);
        // req.telegramUser viene de DynamicAuthGuard → TelegramAuthService (HMAC validado)
        const tgUser = req.telegramUser;
        if (!tgUser || !tgUser.id) {
          throw new AppError(ErrorCode.INIT_DATA_INVALID, 'Invalid telegram user data', 400);
        }

        // Buscar o crear usuario en la DB
        const dbUser = await this.userService.findOrCreateFromTelegram(tgUser);

        // Intentar reusar un token existente válido
        const existingToken = await this.authService.findValidToken(tgUser.id);

        if (existingToken) {
          const expiresInMs =
            new Date(existingToken.createdAt).getTime() + 3600000 - Date.now();

          if (expiresInMs > 0 && !existingToken.revoked) {
            return {
              ok: true,
              token: existingToken.token,
              sessionId: existingToken.session_id || existingToken.token,
              expiresIn: Math.floor(expiresInMs / 1000),
              reused: true,
            };
          }
        }

        const tokenValue = crypto.randomBytes(32).toString('hex');
        await this.authService.create({
          type: 'telegram_miniapp',
          token: tokenValue,
          session_id: tokenValue,
          userAgent: req.headers['user-agent'],
          sub: tgUser.id,
          userTlg: tgUser,
        });
        return { ok: true, sessionId: tokenValue };

      default:
        break;
    }

    return {
      ok,
      msg,
    }
  }

  @Put('api/users')
  @UseGuards(DynamicAuthGuard)
  async apiPut(@Body() body: any, @Req() req) {
    return this.api(body, req, null);
  }

  private formatErrors(errors: any[]) {
    return errors.map(err => ({
      property: err.property,
      constraints: err.constraints,
    }));
  }

};




