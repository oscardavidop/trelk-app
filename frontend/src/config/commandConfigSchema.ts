export type CommandFieldType = 'select' | 'number' | 'boolean' | 'text';

export interface CommandConfigFieldSchema {
  key: string;
  label: string;
  description?: string;
  type: CommandFieldType;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface CommandConfigSchemaEntry {
  title: string;
  description: string;
  fields: CommandConfigFieldSchema[];
}

export const commandConfigSchema: Record<string, CommandConfigSchemaEntry> = {
  apk: {
    title: 'APK',
    description: 'Configure APK search engines',
    fields: [
      {
        key: 'engine',
        label: 'Search Engine',
        type: 'select',
        options: ['aptoide', 'gplay'],
      },
      {
        key: 'inline.results_per_page',
        label: 'Results per page',
        type: 'number',
        min: 1,
        max: 50,
      },
      {
        key: 'inline.show_url',
        label: 'Show URL',
        type: 'boolean',
      },
    ],
  },
  shorten: {
    title: 'URL Shortener',
    description: 'Configure URL shortening service',
    fields: [
      {
        key: 'engine',
        label: 'Shortener Engine',
        type: 'select',
        options: ['tinyurl', 'bitly'],
      },
    ],
  },
  tiktok: {
    title: 'TikTok',
    description: 'Configure TikTok download mode',
    fields: [
      {
        key: 'mode',
        label: 'Download Mode',
        type: 'select',
        options: ['direct', 'callback'],
      },
    ],
  },
};

export type ConfigurableCommandKey = keyof typeof commandConfigSchema;
