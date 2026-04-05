import { Global, Module } from '@nestjs/common';
import { PendingDeleteService } from './pending-delete.service';

@Global()
@Module({
  providers: [PendingDeleteService],
  exports: [PendingDeleteService],
})
export class PendingDeleteModule {}
