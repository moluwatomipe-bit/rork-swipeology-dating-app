import { supabase } from '@/supabase';

export interface PronounOption {
  id: string;
  label: string;
  value: string;
}

const FALLBACK_PRONOUNS: PronounOption[] = [
  { id: 'fallback-1', label: 'He/Him', value: 'he/him' },
  { id: 'fallback-2', label: 'She/Her', value: 'she/her' },
  { id: 'fallback-3', label: 'They/Them', value: 'they/them' },
  { id: 'fallback-4', label: 'He/They', value: 'he/they' },
  { id: 'fallback-5', label: 'She/They', value: 'she/they' },
  { id: 'fallback-6', label: 'Ze/Zir', value: 'ze/zir' },
  { id: 'fallback-7', label: 'Prefer not to say', value: 'prefer not to say' },
];

export async function fetchPronouns(): Promise<PronounOption[]> {
  try {
    console.log('[Pronouns] Fetching pronouns from Supabase...');
    const { data, error } = await supabase
      .from('pronouns')
      .select('id, label, value')
      .order('label', { ascending: true }); // FIXED

    if (error) {
      console.log('[Pronouns] Fetch error:', error.message);
      return FALLBACK_PRONOUNS;
    }

    if (data && data.length > 0) {
      console.log('[Pronouns] Loaded', data.length, 'pronouns from Supabase');
      return data as PronounOption[];
    }

    console.log('[Pronouns] No data returned, using fallback');
    return FALLBACK_PRONOUNS;
  } catch (err) {
    console.log('[Pronouns] Exception:', err);
    return FALLBACK_PRONOUNS;
  }
}

