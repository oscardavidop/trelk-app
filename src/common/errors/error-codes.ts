/**
 * Global error code registry.
 * Every error in the system maps to one of these codes.
 * Frontend uses the associated i18nKey for localized display.
 */
export enum ErrorCode {
  // ── Generic ──
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  NOT_FOUND = 'NOT_FOUND',

  // ── Auth ──
  UNAUTHORIZED = 'UNAUTHORIZED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INIT_DATA_MISSING = 'INIT_DATA_MISSING',
  INIT_DATA_INVALID = 'INIT_DATA_INVALID',
  INIT_DATA_EXPIRED = 'INIT_DATA_EXPIRED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',

  // ── Rate Limiting ──
  RATE_LIMITED = 'RATE_LIMITED',

  // ── Security / PIN ──
  PIN_INCORRECT = 'PIN_INCORRECT',
  PIN_INVALID_FORMAT = 'PIN_INVALID_FORMAT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  RECOVERY_LOCKED = 'RECOVERY_LOCKED',
  RECOVERY_NOT_VERIFIED = 'RECOVERY_NOT_VERIFIED',
  CURRENT_PIN_REQUIRED = 'CURRENT_PIN_REQUIRED',
  SECURITY_QUESTIONS_INVALID = 'SECURITY_QUESTIONS_INVALID',

  // ── Reviews / Ratings ──
  REVIEW_NOT_FOUND = 'REVIEW_NOT_FOUND',
  REVIEW_INVALID_ID = 'REVIEW_INVALID_ID',
  RATING_INVALID = 'RATING_INVALID',
  REVIEW_TEXT_TOO_LONG = 'REVIEW_TEXT_TOO_LONG',
  REVIEW_EDIT_PENDING = 'REVIEW_EDIT_PENDING',

  // ── Reports ──
  REPORT_DUPLICATE = 'REPORT_DUPLICATE',
  REPORT_NOT_FOUND = 'REPORT_NOT_FOUND',
  REPORT_INVALID_CATEGORY = 'REPORT_INVALID_CATEGORY',
  REPORT_MESSAGE_INVALID = 'REPORT_MESSAGE_INVALID',

  // ── Replies ──
  REPLY_NOT_FOUND = 'REPLY_NOT_FOUND',
  REPLY_INVALID_LENGTH = 'REPLY_INVALID_LENGTH',

  // ── Favorites ──
  FAVORITE_NOT_FOUND = 'FAVORITE_NOT_FOUND',
  FAVORITE_NOT_YOURS = 'FAVORITE_NOT_YOURS',
  COLLECTION_NOT_FOUND = 'COLLECTION_NOT_FOUND',
  COLLECTION_ALREADY_EXISTS = 'COLLECTION_ALREADY_EXISTS',
  COLLECTION_NAME_INVALID = 'COLLECTION_NAME_INVALID',

  // ── Command Favorites ──
  COMMAND_INVALID = 'COMMAND_INVALID',

  // ── Suggestions ──
  SUGGESTION_NOT_FOUND = 'SUGGESTION_NOT_FOUND',
  SUGGESTION_TITLE_INVALID = 'SUGGESTION_TITLE_INVALID',
  SUGGESTION_DESC_INVALID = 'SUGGESTION_DESC_INVALID',
  SUGGESTION_INVALID_STATUS = 'SUGGESTION_INVALID_STATUS',
  SUGGESTION_COMMENT_INVALID = 'SUGGESTION_COMMENT_INVALID',

  // ── Payments / Subscription ──
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_NOT_ACTIVE = 'SUBSCRIPTION_NOT_ACTIVE',
  SUBSCRIPTION_NO_ACCESS = 'SUBSCRIPTION_NO_ACCESS',
  LIMIT_REACHED_PREMIUM = 'LIMIT_REACHED_PREMIUM',

  // ── Files / Uploads ──
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  FILE_LIMIT_EXCEEDED = 'FILE_LIMIT_EXCEEDED',

  // ── Alerts / Notifications ──
  ALERT_NOT_FOUND = 'ALERT_NOT_FOUND',
  NOTIFICATION_INVALID = 'NOTIFICATION_INVALID',

  // ── Admin ──
  ADMIN_ONLY = 'ADMIN_ONLY',

  // ── Sessions ──
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',

  // ── Config ──
  CONFIG_INVALID = 'CONFIG_INVALID',
  COMMAND_NOT_FOUND = 'COMMAND_NOT_FOUND',

  // ── AI ──
  AI_UNAVAILABLE = 'AI_UNAVAILABLE',

  // ── Limits ──
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
}

/** i18n key map: ErrorCode → frontend translation key */
export const ERROR_I18N: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN_ERROR]: 'errors.unknown',
  [ErrorCode.VALIDATION_ERROR]: 'errors.validation',
  [ErrorCode.PAYLOAD_TOO_LARGE]: 'errors.payloadTooLarge',
  [ErrorCode.NOT_FOUND]: 'errors.notFound',

  [ErrorCode.UNAUTHORIZED]: 'errors.auth.unauthorized',
  [ErrorCode.SESSION_EXPIRED]: 'errors.auth.sessionExpired',
  [ErrorCode.INIT_DATA_MISSING]: 'errors.auth.initDataMissing',
  [ErrorCode.INIT_DATA_INVALID]: 'errors.auth.initDataInvalid',
  [ErrorCode.INIT_DATA_EXPIRED]: 'errors.auth.initDataExpired',
  [ErrorCode.TOKEN_EXPIRED]: 'errors.auth.tokenExpired',
  [ErrorCode.TOKEN_INVALID]: 'errors.auth.tokenInvalid',
  [ErrorCode.TOKEN_REVOKED]: 'errors.auth.tokenRevoked',
  [ErrorCode.USER_NOT_FOUND]: 'errors.auth.userNotFound',

  [ErrorCode.RATE_LIMITED]: 'errors.rateLimited',

  [ErrorCode.PIN_INCORRECT]: 'errors.security.pinIncorrect',
  [ErrorCode.PIN_INVALID_FORMAT]: 'errors.security.pinInvalidFormat',
  [ErrorCode.ACCOUNT_LOCKED]: 'errors.security.accountLocked',
  [ErrorCode.RECOVERY_LOCKED]: 'errors.security.recoveryLocked',
  [ErrorCode.RECOVERY_NOT_VERIFIED]: 'errors.security.recoveryNotVerified',
  [ErrorCode.CURRENT_PIN_REQUIRED]: 'errors.security.currentPinRequired',
  [ErrorCode.SECURITY_QUESTIONS_INVALID]: 'errors.security.questionsInvalid',

  [ErrorCode.REVIEW_NOT_FOUND]: 'errors.review.notFound',
  [ErrorCode.REVIEW_INVALID_ID]: 'errors.review.invalidId',
  [ErrorCode.RATING_INVALID]: 'errors.review.ratingInvalid',
  [ErrorCode.REVIEW_TEXT_TOO_LONG]: 'errors.review.textTooLong',
  [ErrorCode.REVIEW_EDIT_PENDING]: 'errors.review.editPending',

  [ErrorCode.REPORT_DUPLICATE]: 'errors.report.duplicate',
  [ErrorCode.REPORT_NOT_FOUND]: 'errors.report.notFound',
  [ErrorCode.REPORT_INVALID_CATEGORY]: 'errors.report.invalidCategory',
  [ErrorCode.REPORT_MESSAGE_INVALID]: 'errors.report.messageInvalid',

  [ErrorCode.REPLY_NOT_FOUND]: 'errors.reply.notFound',
  [ErrorCode.REPLY_INVALID_LENGTH]: 'errors.reply.invalidLength',

  [ErrorCode.FAVORITE_NOT_FOUND]: 'errors.favorite.notFound',
  [ErrorCode.FAVORITE_NOT_YOURS]: 'errors.favorite.notYours',
  [ErrorCode.COLLECTION_NOT_FOUND]: 'errors.favorite.collectionNotFound',
  [ErrorCode.COLLECTION_ALREADY_EXISTS]: 'errors.favorite.collectionExists',
  [ErrorCode.COLLECTION_NAME_INVALID]: 'errors.favorite.collectionNameInvalid',

  [ErrorCode.COMMAND_INVALID]: 'errors.command.invalid',

  [ErrorCode.SUGGESTION_NOT_FOUND]: 'errors.suggestion.notFound',
  [ErrorCode.SUGGESTION_TITLE_INVALID]: 'errors.suggestion.titleInvalid',
  [ErrorCode.SUGGESTION_DESC_INVALID]: 'errors.suggestion.descInvalid',
  [ErrorCode.SUGGESTION_INVALID_STATUS]: 'errors.suggestion.invalidStatus',
  [ErrorCode.SUGGESTION_COMMENT_INVALID]: 'errors.suggestion.commentInvalid',

  [ErrorCode.SUBSCRIPTION_NOT_FOUND]: 'errors.subscription.notFound',
  [ErrorCode.SUBSCRIPTION_NOT_ACTIVE]: 'errors.subscription.notActive',
  [ErrorCode.SUBSCRIPTION_NO_ACCESS]: 'errors.subscription.noAccess',
  [ErrorCode.LIMIT_REACHED_PREMIUM]: 'errors.subscription.limitPremium',

  [ErrorCode.FILE_NOT_FOUND]: 'errors.file.notFound',
  [ErrorCode.FILE_TOO_LARGE]: 'errors.file.tooLarge',
  [ErrorCode.FILE_INVALID_TYPE]: 'errors.file.invalidType',
  [ErrorCode.FILE_LIMIT_EXCEEDED]: 'errors.file.limitExceeded',

  [ErrorCode.ALERT_NOT_FOUND]: 'errors.alert.notFound',
  [ErrorCode.NOTIFICATION_INVALID]: 'errors.notification.invalid',

  [ErrorCode.ADMIN_ONLY]: 'errors.adminOnly',

  [ErrorCode.SESSION_NOT_FOUND]: 'errors.session.notFound',

  [ErrorCode.CONFIG_INVALID]: 'errors.config.invalid',
  [ErrorCode.COMMAND_NOT_FOUND]: 'errors.command.notFound',

  [ErrorCode.AI_UNAVAILABLE]: 'errors.aiUnavailable',

  [ErrorCode.LIMIT_EXCEEDED]: 'errors.limitExceeded',
  [ErrorCode.AUTH_REQUIRED]: 'errors.authRequired',
};
