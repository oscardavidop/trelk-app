

export interface BotCommand {
  uniqueName: string;
  name: string[];
  alias: string[];
  protected: boolean;
  group: string;
  category?: string;
  description?: string;
}

import commandsData from './commands.json';

function normalizeCommands(data: unknown): BotCommand[] {
  if (Array.isArray(data)) return data as BotCommand[];

  if (data && typeof data === 'object') {
    const maybeDefault = (data as { default?: unknown }).default;
    if (Array.isArray(maybeDefault)) return maybeDefault as BotCommand[];

    const values = Object.values(data).filter((item) => item && typeof item === 'object');
    if (values.length > 0) return values as BotCommand[];
  }

  return [];
}

export const BOT_COMMANDS: BotCommand[] = normalizeCommands(commandsData);
