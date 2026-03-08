// src/user-infraction/user-infraction.service.ts
import { Injectable } from "@nestjs/common";
// import { InjectRepository } from "@nestjs/typeorm";
// import { Repository } from "typeorm";
import { UserInfraction } from "./user-infraction.entity";
import { User } from "../../user.entity";

@Injectable()
export class UserInfractionService {
    constructor(
        // @InjectRepository(UserInfraction)
        // private readonly infractionRepo: Repository<UserInfraction>,
    ) { }

    
}
