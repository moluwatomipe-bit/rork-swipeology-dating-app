export interface IcebreakerQuestion {
  id: string;
  question: string;
  options: string[];
}

export const ICEBREAKER_QUESTIONS: IcebreakerQuestion[] = [
  {
    id: 'weekend',
    question: 'Perfect weekend looks like...',
    options: ['Netflix & chill', 'Outdoor adventure', 'Party with friends', 'Quiet reading time', 'Exploring new places'],
  },
  {
    id: 'study_style',
    question: 'My study style is...',
    options: ['Library all day', 'Study groups', 'Last-minute cramming', 'Coffee shop vibes', 'Late night sessions'],
  },
  {
    id: 'food',
    question: 'Go-to comfort food?',
    options: ['Pizza', 'Sushi', 'Tacos', 'Ramen', 'Mac & cheese'],
  },
  {
    id: 'social_battery',
    question: 'My social battery is...',
    options: ['Always charged', 'Selective socializer', 'Small groups only', 'Recharge alone', 'Depends on the day'],
  },
  {
    id: 'music',
    question: 'Music that defines me:',
    options: ['Hip-hop/R&B', 'Pop', 'Rock/Indie', 'EDM', 'A bit of everything'],
  },
];

export interface PersonalityBadge {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export const PERSONALITY_BADGES: PersonalityBadge[] = [
  { id: 'introvert', label: 'Introvert', emoji: '🌙', color: '#6366F1' },
  { id: 'extrovert', label: 'Extrovert', emoji: '☀️', color: '#F59E0B' },
  { id: 'adventurer', label: 'Adventurer', emoji: '🏔️', color: '#10B981' },
  { id: 'night_owl', label: 'Night Owl', emoji: '🦉', color: '#8B5CF6' },
  { id: 'early_bird', label: 'Early Bird', emoji: '🐦', color: '#F97316' },
  { id: 'study_buddy', label: 'Study Buddy', emoji: '📚', color: '#3B82F6' },
  { id: 'foodie', label: 'Foodie', emoji: '🍕', color: '#EF4444' },
  { id: 'gym_rat', label: 'Gym Rat', emoji: '💪', color: '#14B8A6' },
  { id: 'creative', label: 'Creative', emoji: '🎨', color: '#EC4899' },
  { id: 'gamer', label: 'Gamer', emoji: '🎮', color: '#7C3AED' },
  { id: 'music_lover', label: 'Music Lover', emoji: '🎵', color: '#D946EF' },
  { id: 'chill_vibes', label: 'Chill Vibes', emoji: '✌️', color: '#06B6D4' },
];

export const MAX_BADGES = 4;
