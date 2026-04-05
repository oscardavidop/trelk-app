import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityProfile, SecurityProfileSchema } from './schemas/security-profile.schema';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SecurityProfile.name, schema: SecurityProfileSchema },
    ]),
  ],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
