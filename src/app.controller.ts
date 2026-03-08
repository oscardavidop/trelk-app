import { Controller } from '@nestjs/common';

/**
 * AppController — Root controller.
 * All UI is served by React SPA via fastifyStatic + SPA fallback.
 * API routes live in their respective modules (UsersUiModule, AuthModule, etc.).
 */
@Controller()
export class AppController {
  constructor() {}
}
