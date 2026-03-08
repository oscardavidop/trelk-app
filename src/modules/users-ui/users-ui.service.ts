// src/users-ui/users-ui.service.ts
import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';

@Injectable()
export class UsersUiService {
  // constructor(@InjectModel(Bot.name) private botModel: Model<BotDocument>) {}

  async getBotProfile(botId: string) {
    // Simulación: en la vida real leerías de Mongo:
    // const bot = await this.botModel.findById(botId).lean();
    return {
      botId,
      name: 'Trelk Bot',
      about: 'Based on the WhatsApp bot Maria Bot, todos los derechos reservados ✌🏻',
      avatar: 'https://cdn1.telesco.pe/file/njHl2aO43UoJAAxxx',
    };
  }
}
