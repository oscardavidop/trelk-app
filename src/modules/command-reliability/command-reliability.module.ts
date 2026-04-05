import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandExecution, CommandExecutionSchema } from './schemas/command-execution.schema';
import { CommandReliabilityService } from './command-reliability.service';
import { CommandReliabilityController } from './command-reliability.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommandExecution.name, schema: CommandExecutionSchema },
    ]),
    RedisModule,
  ],
  controllers: [CommandReliabilityController],
  providers: [CommandReliabilityService],
  exports: [CommandReliabilityService],
})
export class CommandReliabilityModule {}
