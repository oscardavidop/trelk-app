import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AbuseService } from './abuse.service';
import { AbuseRecord, AbuseRecordSchema } from './schemas/abuse-record.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AbuseRecord.name, schema: AbuseRecordSchema },
    ]),
  ],
  providers: [AbuseService],
  exports: [AbuseService],
})
export class AbuseModule {}
