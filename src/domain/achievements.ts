import type { Achievement } from '@/types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    titleKey: 'achievement.first_win.title',
    descriptionKey: 'achievement.first_win.description',
    icon: '🏆',
    xpReward: 50,
  },
  {
    id: 'quick_mate',
    titleKey: 'achievement.quick_mate.title',
    descriptionKey: 'achievement.quick_mate.description',
    icon: '⚡',
    xpReward: 60,
  },
  {
    id: 'win_streak_3',
    titleKey: 'achievement.win_streak_3.title',
    descriptionKey: 'achievement.win_streak_3.description',
    icon: '🔥',
    xpReward: 70,
  },
  {
    id: 'win_streak_10',
    titleKey: 'achievement.win_streak_10.title',
    descriptionKey: 'achievement.win_streak_10.description',
    icon: '🌟',
    xpReward: 150,
  },
  {
    id: 'first_promotion',
    titleKey: 'achievement.first_promotion.title',
    descriptionKey: 'achievement.first_promotion.description',
    icon: '⬆️',
    xpReward: 80,
  },
  {
    id: 'reach_gold',
    titleKey: 'achievement.reach_gold.title',
    descriptionKey: 'achievement.reach_gold.description',
    icon: '🟡',
    xpReward: 120,
  },
  {
    id: 'reach_diamond',
    titleKey: 'achievement.reach_diamond.title',
    descriptionKey: 'achievement.reach_diamond.description',
    icon: '💎',
    xpReward: 250,
  },
  {
    id: 'reach_supreme_wizard',
    titleKey: 'achievement.reach_supreme_wizard.title',
    descriptionKey: 'achievement.reach_supreme_wizard.description',
    icon: '🔮',
    xpReward: 500,
  },
  {
    id: 'comeback_draw',
    titleKey: 'achievement.comeback_draw.title',
    descriptionKey: 'achievement.comeback_draw.description',
    icon: '🤝',
    xpReward: 40,
  },
  {
    id: 'games_50',
    titleKey: 'achievement.games_50.title',
    descriptionKey: 'achievement.games_50.description',
    icon: '📜',
    xpReward: 100,
  },
  {
    id: 'promote_piece',
    titleKey: 'achievement.promote_piece.title',
    descriptionKey: 'achievement.promote_piece.description',
    icon: '👑',
    xpReward: 40,
  },
  {
    id: 'checkmate_with_knight',
    titleKey: 'achievement.checkmate_with_knight.title',
    descriptionKey: 'achievement.checkmate_with_knight.description',
    icon: '♞',
    xpReward: 60,
  },
];

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
