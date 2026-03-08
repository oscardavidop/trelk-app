import { Type } from 'class-transformer';
import {
  IsOptional, IsString, IsBoolean, IsNumber, IsIn, IsObject,
  ValidateNested, Min, Max, IsISO31661Alpha2,
} from 'class-validator';

// === Command Config ===
export class CommandInlineDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  results_per_page?: number;

  @IsOptional()
  @IsBoolean()
  show_url?: boolean;
}

export class CommandDto {
  @IsString()
  engine: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CommandInlineDto)
  inline?: CommandInlineDto;
}

export class UpsertCommandDto {
  @IsString()
  key: string;

  @ValidateNested()
  @Type(() => CommandDto)
  command: CommandDto;
}

// === Premium Command ===
export class PremiumCommandDto {
  @IsString()
  alias: string;
}

export class UpsertPremiumCommandDto {
  @IsString()
  key: string;

  @ValidateNested()
  @Type(() => PremiumCommandDto)
  command: PremiumCommandDto;
}

// === Datetime Format ===
const DATE_PART_OPTIONS = ['numeric', '2-digit'] as const;
export class DatetimeFormatDto {
  @IsOptional()
  @IsIn(DATE_PART_OPTIONS)
  month?: string;

  @IsOptional()
  @IsIn(DATE_PART_OPTIONS)
  day?: string;

  @IsOptional()
  @IsIn(['numeric', '2-digit'])
  year?: string;

  @IsOptional()
  @IsIn(DATE_PART_OPTIONS)
  hour?: string;

  @IsOptional()
  @IsIn(DATE_PART_OPTIONS)
  minute?: string;

  @IsOptional()
  @IsIn(DATE_PART_OPTIONS)
  second?: string;
}

// === Locale ===
export class UpdateLocaleDto {
  @IsOptional()
  @IsIn(['es', 'en', 'fr', 'pt', 'it', 'de', 'ru', 'zh-CN', 'zh-TW', 'ja', 'ko', 'ar', 'hi', 'tr', 'nl'])
  lang?: string;

  @IsOptional()
  @IsString()
  tz?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DatetimeFormatDto)
  datetime_format?: DatetimeFormatDto;
}
