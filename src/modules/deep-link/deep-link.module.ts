import { Module } from '@nestjs/common';
import { DeepLinkService } from './deep-link.service';
import { DeepLinkController } from './deep-link.controller';

@Module({
  controllers: [DeepLinkController],
  providers: [DeepLinkService],
  exports: [DeepLinkService],
})
export class DeepLinkModule {}
