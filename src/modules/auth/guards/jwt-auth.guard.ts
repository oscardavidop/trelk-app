import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    constructor() {
        super();
    }

    handleRequest(err, user, info, context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const handler = context.getHandler().name;
    
        if (user) {
            user.callHeaders = request.headers;
            user.location = {
                ip: request.headers['cf-connecting-ip'] || request.ip || 'unknown',
                country: request.headers['cf-ipcountry'] || 'UNKNOWN',
                city: request.headers['cf-ipcity'] || 'unknown',
                region: fixEncoding(request.headers['cf-region'] || 'unknown'),
                latitude: request.headers['cf-iplatitude'] || '0',
                longitude: request.headers['cf-iplongitude'] || '0',
                timezone: request.headers['cf-timezone'] || 'UTC',
            }

            // if (user.session.userAgent !== request.headers['user-agent']) {
            //     console.log("User-Agent mismatch. Revoking token.", user.session.userAgent, request.headers['user-agent']);
            //     throw new UnauthorizedException("Has iniciado sesión en otro dispositivo, por favor vuelve a iniciar sesión", "PRIVATE_INTERNAL_ERROR");
            // }

            // if (user.session.ip !== request.headers['cf-connecting-ip']) {
            //     console.log("IP mismatch. Revoking token.");
            //     throw new UnauthorizedException("Has iniciado sesión en otro dispositivo, por favor vuelve a iniciar sesión", "PRIVATE_INTERNAL_ERROR");
            // }
        } else {
            throw err || new UnauthorizedException(
                "Por favor vuelve a iniciar sesión",
                "UNAUTHORIZED"
            );
        }

        // if (!request.headers['cf-connecting-ip'] || !request.headers['user-agent']) {
        //     throw new ForbiddenException("Acceso denegado", "PRIVATE_INTERNAL_ERROR");
        // }


        return user;
    }

    
}


function fixEncoding(text: string | undefined): string {
    if (!text) return '';
    try { return decodeURIComponent(escape(text)); } catch { return text; }
  }


@Injectable()
export class TelegramAuthGuard extends AuthGuard('telegram') {}

@Injectable()
export class BearerAuthGuard extends AuthGuard('bearer') {}
