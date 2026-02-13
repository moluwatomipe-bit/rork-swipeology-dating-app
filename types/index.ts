export interface User {
  id: string;
  phone_number: string;
  school_email: string;
  password: string;
  university: string;
  is_verified_esu: boolean;
  first_name: string;
  age: number;
  gender: 'man' | 'woman' | 'non-binary' | 'prefer not to say';
  dating_preference: 'men' | 'women' | 'both';
  wants_friends: boolean;
  wants_dating: boolean;
  photo1_url: string;
  photo2_url: string;
  photo3_url: string;
  photo4_url: string;
  photo5_url: string;
  photo6_url: string;
  bio: string;
  major: string;
  class_year: string;
  interests: string;
}

export interface Swipe {
  id: string;
  user_from: string;
  user_to: string;
  context: 'friends' | 'dating';
  liked: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  user1: string;
  user2: string;
  context: 'friends' | 'dating';
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  match_id: string | null;
  reason: string;
  reported_at: string;
}

export type OnboardingStep =
  | 'welcome'
  | 'login'
  | 'phone-login'
  | 'esu-email'
  | 'create-password'
  | 'name-age'
  | 'gender'
  | 'dating-preference'
  | 'intent'
  | 'photos'
  | 'bio-details'
  | 'notifications'
  | 'tutorial'
  | 'complete';
