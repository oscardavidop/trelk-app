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
                ip: request.headers['cf-connecting-ip'] || "192.262.2.3",
                country: request.headers['cf-ipcountry'] || "CO",
                city: request.headers['cf-ipcity'] || "Medellin",
                region: fixEncoding(request.headers['cf-region']) || "Antioquia",
                latitude: request.headers['cf-iplatitude'] || "6.2442",
                longitude: request.headers['cf-iplongitude'] || "-75.5812",
                timezone: request.headers['cf-timezone'] || "America/Bogota",
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

function fixEncoding(text: string): string {
    return decodeURIComponent(escape(text));
  }


@Injectable()
export class TelegramAuthGuard extends AuthGuard('telegram') {}

@Injectable()
export class CookieAuthGuard extends AuthGuard('cookie') {}
