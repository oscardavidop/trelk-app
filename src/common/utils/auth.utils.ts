export function extractUserId(req: any): number {
  const u = req.user;
  return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
}
