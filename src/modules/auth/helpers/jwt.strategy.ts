import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../users/schemas/user.schema';
import { Token, TokenDocument } from '../schemas/token.schema'; 

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name, 'mbot') private readonly userModel: Model<UserDocument>,
    @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('_auth'),
      secretOrKey: configService.get<string>('JWT_SECRET', 'secret'),
    });
  }

  async validate(payload: any): Promise<any> {
    const user = await this.userModel.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado', 'USER_NOT_FOUND');
    }

    const token = await this.tokenModel.findOne({
      token: payload.jti,
      revoked: false,
    });

    if (!token) {
      throw new UnauthorizedException('Por favor, vuelve a iniciar sesión', 'TOKEN_NOT_FOUND');
    }

    return {
      auth: user,
      token: payload,
      session: token,
    };
  }
}
