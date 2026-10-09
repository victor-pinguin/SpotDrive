import { BADGES } from '../data/badges';
import type { BadgeProgress, ID, Spot } from '../types/models';

export function badgeProgress(spots: Spot[], userId: ID): BadgeProgress[] {
  const mine = spots.filter((s) => s.userId === userId);
  return BADGES.map(({ progress, ...badge }) => {
    const current = Math.min(progress(mine), badge.target);
    return { badge, current, unlocked: current >= badge.target };
  });
}

export const unlockedBadgeIds = (spots: Spot[], userId: ID) =>
  new Set(badgeProgress(spots, userId).filter((b) => b.unlocked).map((b) => b.badge.id));
