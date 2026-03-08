// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   ManyToOne,
//   CreateDateColumn,
// } from "typeorm";
// import { User } from "../users/user.entity";

// @Entity()
// export class Token {
//   @PrimaryGeneratedColumn('uuid')
//   id: number;

//   @Column({ nullable: true })
//   type: string;

//   @Column({ nullable: true })
//   sub: number;

//   @Column({ nullable: true })
//   device: string;

//   @Column({ nullable: true })
//   userAgent: string;

//   @Column({ nullable: true })
//   lastUsed: Date;

//   @Column({ nullable: true })
//   browser: string;

//   @Column({ nullable: true })
//   os: string;

//   @Column({ nullable: true })
//   ip: string;

//   @Column({ nullable: true })
//   platform: string;

//   @Column({ nullable: true })
//   appVersion: string;

//   @Column({ nullable: true })
//   deviceId: string;

//   @Column({ unique: true })
//   token: string;

//   @Column({ nullable: true })
//   session_id: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @Column({ type: "boolean", default: false })
//   revoked: boolean;

//   @Column({ nullable: true })
//   scope: string;

//   @Column({ default: false })
//   isBlockedFor2fa: boolean; // Bloqueado hasta que se verifique el OTP

//   @Column({ nullable: true })
//   locationRegion: string;

//   @Column({ nullable: true })
//   locationCountry: string;

//   @Column({ nullable: true })
//   locationCity: string;

//   @Column({ nullable: true })
//   locationLat: string;

//   @Column({ nullable: true })
//   locationLng: string;

//   @Column({nullable: true})
//   locationTimeZone: string;
  
//   async revoke() {
//     this.revoked = true;
//   }

// }
