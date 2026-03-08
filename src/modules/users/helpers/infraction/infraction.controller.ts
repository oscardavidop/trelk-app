import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
// import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/common/custom/interfaces/authuser.interface';
import { UserInfractionService } from './infraction.service';


@Controller('users/infractions')
@UseGuards(JwtAuthGuard)
export class InfractionController {
    constructor(private readonly infractionService: UserInfractionService) { }



}