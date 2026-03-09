/**
 * Achievement definitions — shared between bot and API.
 * Metadata only. User progress lives in user_gamification collection.
 */

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  goal: number;
  rewardXP: number;
  rewardLabel: string;
  category?: 'general' | 'daily' | 'weekly';
  resetInterval?: 'daily' | 'weekly';
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: 'first_command', name: 'First Command', description: 'Usa un comando por primera vez', icon: 'trophy', goal: 1, rewardXP: 50, rewardLabel: 'Badge Pionero' },
  { id: 'collector_10', name: 'Collector', description: 'Guarda 10 favoritos', icon: 'star', goal: 10, rewardXP: 100, rewardLabel: '+5 solicitudes IA diarias' },
  { id: 'power_user', name: 'Power User', description: 'Usa 100 comandos', icon: 'rocket', goal: 100, rewardXP: 200, rewardLabel: 'Badge Power User' },
  { id: 'explorer', name: 'Explorer', description: 'Prueba 10 comandos diferentes', icon: 'flame', goal: 10, rewardXP: 150, rewardLabel: 'Tema exclusivo' },
  { id: 'veteran', name: 'Veteran', description: 'Usa la app 7 dias seguidos', icon: 'gem', goal: 7, rewardXP: 300, rewardLabel: 'Badge Diamond' },
  { id: 'social_star', name: 'Social Star', description: 'Comparte 5 comandos con amigos', icon: 'sparkles', goal: 5, rewardXP: 100, rewardLabel: 'Badge Social' },
  { id: 'linguist', name: 'Linguista', description: 'Traduce en 5 idiomas distintos', icon: 'globe', goal: 5, rewardXP: 120, rewardLabel: '+3 traducciones diarias' },
  { id: 'night_owl', name: 'Night Owl', description: 'Usa la app despues de medianoche', icon: 'moon', goal: 1, rewardXP: 50, rewardLabel: 'Badge Nocturno' },
  { id: 'ai_master', name: 'AI Master', description: 'Haz 50 consultas a ChatGPT', icon: 'bot', goal: 50, rewardXP: 250, rewardLabel: '+10 consultas IA diarias' },
  { id: 'speed_runner', name: 'Speed Runner', description: 'Usa 5 comandos en 1 minuto', icon: 'zap', goal: 5, rewardXP: 80, rewardLabel: 'Badge Rayo' },
  { id: 'music_lover', name: 'Music Lover', description: 'Reproduce 20 canciones', icon: 'music', goal: 20, rewardXP: 150, rewardLabel: 'Badge Melomano' },
  { id: 'daily_streak', name: 'On Fire', description: 'Manten racha de 14 dias', icon: 'flame', goal: 14, rewardXP: 500, rewardLabel: 'Badge On Fire + 20 IA' },
  // Daily missions
  { id: 'daily_5_commands', name: 'Mision Diaria', description: 'Usa 5 comandos hoy', icon: 'calendar-check', goal: 5, rewardXP: 30, rewardLabel: 'Bonus diario', category: 'daily', resetInterval: 'daily' },
  { id: 'daily_translate', name: 'Traductor del Dia', description: 'Traduce algo hoy', icon: 'languages', goal: 1, rewardXP: 20, rewardLabel: 'Bonus traduccion', category: 'daily', resetInterval: 'daily' },
  // Weekly missions
  { id: 'weekly_50_commands', name: 'Mision Semanal', description: 'Usa 50 comandos esta semana', icon: 'calendar-range', goal: 50, rewardXP: 100, rewardLabel: 'Bonus semanal', category: 'weekly', resetInterval: 'weekly' },
  { id: 'weekly_music_10', name: 'DJ de la Semana', description: 'Reproduce 10 canciones esta semana', icon: 'headphones', goal: 10, rewardXP: 60, rewardLabel: 'Bonus DJ', category: 'weekly', resetInterval: 'weekly' },
];

export const ACHIEVEMENT_MAP = new Map<string, AchievementDefinition>(
  ACHIEVEMENT_DEFINITIONS.map(a => [a.id, a]),
);

export const XP_LEVELS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000];

export function levelFromXP(xp: number) {
  let lvl = 1;
  for (let i = 1; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i]) lvl = i + 1;
    else break;
  }
  const floor = XP_LEVELS[lvl - 1] ?? 0;
  const ceil = XP_LEVELS[lvl] ?? XP_LEVELS[XP_LEVELS.length - 1] + 2000;
  const inLevel = xp - floor;
  const needed = ceil - floor;
  return { level: lvl, currentXP: inLevel, nextXP: needed, progress: Math.min(inLevel / needed, 1) };
}
