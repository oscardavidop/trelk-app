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

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) { }

  @Post('users/api')
  @UseGuards(DynamicAuthGuard)
  async api(@Body() dto: ChangeSettingsDto, @Req() req, @Res({ passthrough: true }) res) {
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
      return {
        ok: false,
        error: "Bad Request",
      }
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
      
        if (result.modifiedCount === 0) {
          msg = `No changes made.`;
        }
        console.log('result', result);

        break;

      case 'updateConfig':
        const r = await this.userService.updateConfig(req.user.authTelegram.id, body.config);
        // console.log("Update config result", r);
        msg = `Changes saved`;
        break;

      case 'auth':
        // req.telegramUser viene de DynamicAuthGuard → TelegramAuthService (HMAC validado)
        const tgUser = req.telegramUser;
        if (!tgUser || !tgUser.id) {
          return { ok: false, error: 'Invalid telegram user data' };
        }

        // Buscar o crear usuario en la DB
        const dbUser = await this.userService.findOrCreateFromTelegram(tgUser);

        // Intentar reusar un token existente válido
        const existingToken = await this.authService.findValidToken(tgUser.id);

        if (existingToken) {
          const expiresInMs =
            new Date(existingToken.createdAt).getTime() + 3600000 - Date.now();

          if (expiresInMs > 0 && !existingToken.revoked) {
            console.log('Usando token existente para telegramId:', tgUser.id);

            res
              .setCookie('session_id', existingToken.session_id || existingToken.token, {
                path: '/',
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                expires: new Date(Date.now() + expiresInMs),
              })
              .send({
                ok: true,
                token: existingToken.token,
                expiresIn: Math.floor(expiresInMs / 1000),
                reused: true,
              });
            return;
          }
        }

        console.log('Creando nuevo token para telegramId:', tgUser.id);
        const tokenValue = crypto.randomBytes(32).toString('hex');
        await this.authService.create({
          type: 'telegram_miniapp',
          token: tokenValue,
          session_id: tokenValue,
          userAgent: req.headers['user-agent'],
          sub: tgUser.id,
          userTlg: tgUser,
        });
        res
          .setCookie('session_id', tokenValue, {
            path: '/',
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            expires: new Date(Date.now() + 3600000),
          })
          .send({ ok: true });
        return;

      default:
        break;
    }

    return {
      ok: true,
      msg,
    }
  }

  @Put('users/api')
  @UseGuards(DynamicAuthGuard)
  async apiPut(@Body() body: any, @Req() req) {
    return this.api(body, req, null);
  }

};




