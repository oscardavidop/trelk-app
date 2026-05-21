// src/modules/users/schemas/user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  // @Prop({ unique: true, required: false, index: true })
  // customerId: string;

  // Aquí puedes agregar más campos si aparecen más adelante
}

export const UserSchema = SchemaFactory.createForClass(User);


