import { User } from '@/types';
import { ICEBREAKER_QUESTIONS } from '@/constants/matching';

export interface CompatibilityResult {
  score: number;
  sharedInterests: string[];
  sameMajor: boolean;
  icebreakerMatches: number;
  badgeOverlap: number;
}

export function calculateCompatibility(
  userA: User,
  userB: User
): CompatibilityResult {
  let totalPoints = 0;
  let maxPoints = 0;

  const interestsA = (userA.interests || '')
    .split(',')
    .map((i) => i.trim().toLowerCase())
    .filter(Boolean);
  const interestsB = (userB.interests || '')
    .split(',')
    .map((i) => i.trim().toLowerCase())
    .filter(Boolean);

  const sharedInterests = interestsA.filter((i) => interestsB.includes(i));
  const uniqueInterests = new Set([...interestsA, ...interestsB]);

  if (uniqueInterests.size > 0) {
    maxPoints += 35;
    totalPoints += Math.round(
      (sharedInterests.length / Math.max(uniqueInterests.size, 1)) * 35
    );
  }

  const sameMajor =
    !!userA.major &&
    !!userB.major &&
    userA.major.toLowerCase().trim() === userB.major.toLowerCase().trim();

  maxPoints += 15;
  if (sameMajor) totalPoints += 15;

  const answersA = userA.icebreaker_answers || {};
  const answersB = userB.icebreaker_answers || {};
  let icebreakerMatches = 0;

  for (const q of ICEBREAKER_QUESTIONS) {
    if (answersA[q.id] && answersB[q.id]) {
      maxPoints += 10;
      if (answersA[q.id] === answersB[q.id]) {
        totalPoints += 10;
        icebreakerMatches++;
      }
    }
  }

  const badgesA = userA.personality_badges || [];
  const badgesB = userB.personality_badges || [];
  const badgeOverlap = badgesA.filter((b) => badgesB.includes(b)).length;
  const uniqueBadges = new Set([...badgesA, ...badgesB]);

  if (uniqueBadges.size > 0) {
    maxPoints += 20;
    totalPoints += Math.round((badgeOverlap / Math.max(uniqueBadges.size, 1)) * 20);
  }

  const sameClassYear =
    !!userA.class_year &&
    !!userB.class_year &&
    userA.class_year === userB.class_year;

  maxPoints += 10;
  if (sameClassYear) totalPoints += 10;

  const score =
    maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return {
    score: Math.min(score, 100),
    sharedInterests,
    sameMajor,
    icebreakerMatches,
    badgeOverlap,
  };
}

export function getCompatibilityLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 80) return { label: 'Amazing Match', color: '#10B981' };
  if (score >= 60) return { label: 'Great Match', color: '#3B82F6' };
  if (score >= 40) return { label: 'Good Match', color: '#F59E0B' };
  if (score >= 20) return { label: 'Some Common Ground', color: '#F97316' };
  return { label: 'New Discovery', color: '#8B5CF6' };
}
