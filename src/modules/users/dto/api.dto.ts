import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsBoolean,
  IsArray,
  IsString,
  IsIn,
  IsObject,
  ValidateNested,
  IsBooleanString,
  IsNumber,
  IsInt,
  isTimeZone,
  IsISO31661Alpha2,
  IsTimeZone,
  Matches,
} from 'class-validator';

const ALLOWED_SETTINGS = new Set([
  'auto_detect_lang',
  'message_format',
  'time_format',
  'chat_actions',
  'notifications_settings',
  'notifications_settings.semanal_stats',
]);

const ALLOWED_METHODS = new Set(['changeSettings', 'updateConfig', 'auth']);
export class ConfigDto {
  @IsOptional()
  @IsString()
  "config.locale.tz"?: string;

  @IsOptional()
  @IsIn(['es', 'en', 'fr', 'pt', 'it', 'de', 'ru', 'zh-CN', 'zh-TW', 'ja', 'ko', 'ar', 'hi', 'tr', 'nl'])
  "config.locale.lang"?: string;

  @IsOptional()
  // @IsInt()
  bid: number;

}

class DateTimeFormatDto {
  @IsOptional() @IsIn(['2-digit', 'numeric', 'long', 'short', 'narrow'])
  month?: string;

  @IsOptional() @IsIn(['2-digit', 'numeric'])
  day?: string;

  @IsOptional() @IsIn(['2-digit', 'numeric'])
  year?: string;

  @IsOptional() @IsIn(['2-digit', 'numeric'])
  hour?: string;

  @IsOptional() @IsIn(['2-digit', 'numeric'])
  minute?: string;

  @IsOptional() @IsIn(['2-digit', 'numeric'])
  second?: string;

  @IsOptional()
  @IsIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'], {
    message: 'Invalid date format.'
  })
  date?: string;

  @IsOptional()
  @IsIn(['HH:mm', 'hh:mm A', 'HH:mm:ss'], {
    message: 'Invalid time format.'
  })
  time?: string;
}

export class LocaleDto {
  @IsOptional() @IsString() @IsTimeZone()
  tz?: string;

  @IsOptional()
  @IsIn(['es', 'en', 'fr', 'pt', 'it', 'de', 'ru', 'zh-CN', 'zh-TW', 'ja', 'ko', 'ar', 'hi', 'tr', 'nl'])
  lang?: string;

  @IsOptional() @IsISO31661Alpha2()
  country?: string;

  @IsOptional()
  @ValidateNested() // Activa la validación del objeto interno
  @Type(() => DateTimeFormatDto) // Indica a qué clase transformar el objeto recibido
  datetime_format?: DateTimeFormatDto;
}


function detectTimezone(): { key: string; name: string } | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isTimeZone(tz)) return null;
    const key = tz;
    return { key, name: tz };
  } catch {
    return null;
  }
}

/**
 * Transform que convierte cualquier representación booleana
 * (true, false, 0, 1, "true", "false", "0", "1") a boolean.
 */
const ToBool = () => Transform(({ value }) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }
  return !!value;
});

export class SettingsDto {

  @IsOptional()
  @ToBool()
  auto_detect_lang?: boolean;

  @IsOptional()
  @ToBool()
  await_args?: boolean;

  @IsOptional()
  @ToBool()
  message_format?: boolean;

  @IsOptional()
  @ToBool()
  emoji_replies?: boolean;

  @IsOptional()
  @ToBool()
  share_username?: boolean;

  @IsOptional()
  @ToBool()
  store_chat_history?: boolean;

  @IsOptional()
  @ToBool()
  allow_data_usage?: boolean;

  @IsOptional()
  @ToBool()
  notify_semanal_stats?: boolean;

  @IsOptional()
  @ToBool()
  large_text?: boolean;

  @IsOptional()
  @ToBool()
  compact_mode?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(['typing', 'upload_photos', 'upload_videos', 'upload_document'], { each: true })
  @Transform(({ value }) => (value === '' ? undefined : value))
  chat_actions?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['new_commands', 'downtime_alerts', 'feature_announcements', 'security_alerts'], { each: true })
  @Transform(({ value }) => (value === '' ? undefined : value))
  notifications_settings?: string[];

  @IsOptional()
  @IsIn(['12h', '24h'])
  time_format?: '12h' | '24h';
}

export class ChangeSettingsDto {

  @IsIn(Array.from(ALLOWED_METHODS))
  method: 'changeSettings' | 'updateConfig' | 'auth';

  @IsOptional()
  _auth?: string;

  @IsOptional()
  // @IsInt()
  bid: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SettingsDto)
  settings?: SettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigDto)
  config?: ConfigDto;

}

export class UpdateDateDto {
  @IsInt()
  timestamp: number;

  @IsString()
  @IsIn(['createdAt', 'updatedAt'])
  field: 'createdAt' | 'updatedAt';


}