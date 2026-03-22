

// O mejor aún, define una interfaz para tener autocompletado:
export interface BotCommand {
  uniqueName: string;
  name: string[];
  alias: string[];
  protected: boolean;
  group: string;
  // ... otras propiedades
}

import * as commandsData from './commands.json';

// Forzamos a que sea un Array para que .find() siempre funcione
export const BOT_COMMANDS: any[] = Array.isArray(commandsData) 
  ? commandsData 
  : (commandsData as any).default || Object.values(commandsData);
