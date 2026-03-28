export type CommandFieldType = 'select' | 'number' | 'boolean' | 'text';

export interface CommandConfigFieldSchema {
  key: string;
  /** i18n label key (resolved via commands namespace: `field_{command}_{sanitizedKey}`) */
  labelKey: string;
  /** i18n description key */
  descriptionKey?: string;
  type: CommandFieldType;
  options?: { value: string; labelKey: string }[];
  min?: number;
  max?: number;
  placeholder?: string;
  default?: unknown;
}

export interface CommandConfigGroup {
  /** i18n key for group heading */
  titleKey: string;
  fields: CommandConfigFieldSchema[];
}

export interface CommandConfigSchemaEntry {
  /** i18n key for the command title */
  titleKey: string;
  /** i18n key for the command description */
  descriptionKey: string;
  /** Lucide icon name hint (used in UI) */
  icon: string;
  /** Accent color class */
  color: string;
  groups: CommandConfigGroup[];
}

export const commandConfigSchema: Record<string, CommandConfigSchemaEntry> = {
  apk: {
    titleKey: 'cmd_apk_title',
    descriptionKey: 'cmd_apk_desc',
    icon: 'package',
    color: 'emerald',
    groups: [
      {
        titleKey: 'group_search',
        fields: [
          {
            key: 'engine',
            labelKey: 'field_apk_engine',
            descriptionKey: 'field_apk_engine_desc',
            type: 'select',
            options: [
              { value: 'aptoide', labelKey: 'opt_aptoide' },
              { value: 'gplay', labelKey: 'opt_gplay' },
            ],
            default: 'aptoide',
          },
        ],
      },
      {
        titleKey: 'group_inline',
        fields: [
          {
            key: 'inline.results_per_page',
            labelKey: 'field_apk_results',
            descriptionKey: 'field_apk_results_desc',
            type: 'number',
            min: 1,
            max: 50,
            default: 10,
          },
          {
            key: 'inline.show_url',
            labelKey: 'field_apk_show_url',
            descriptionKey: 'field_apk_show_url_desc',
            type: 'boolean',
            default: false,
          },
        ],
      },
    ],
  },

  shorten: {
    titleKey: 'cmd_shorten_title',
    descriptionKey: 'cmd_shorten_desc',
    icon: 'link',
    color: 'sky',
    groups: [
      {
        titleKey: 'group_general',
        fields: [
          {
            key: 'engine',
            labelKey: 'field_shorten_engine',
            descriptionKey: 'field_shorten_engine_desc',
            type: 'select',
            options: [
              { value: 'tinyurl', labelKey: 'opt_tinyurl' },
              { value: 'bitly', labelKey: 'opt_bitly' },
            ],
            default: 'tinyurl',
          },
        ],
      },
    ],
  },

  tiktok: {
    titleKey: 'cmd_tiktok_title',
    descriptionKey: 'cmd_tiktok_desc',
    icon: 'video',
    color: 'rose',
    groups: [
      {
        titleKey: 'group_download',
        fields: [
          {
            key: 'mode',
            labelKey: 'field_tiktok_mode',
            descriptionKey: 'field_tiktok_mode_desc',
            type: 'select',
            options: [
              { value: 'direct', labelKey: 'opt_direct' },
              { value: 'callback', labelKey: 'opt_callback' },
            ],
            default: 'direct',
          },
        ],
      },
    ],
  },
};
