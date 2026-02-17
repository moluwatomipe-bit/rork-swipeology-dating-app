import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://yolnmuisgloideripwqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbG5tdWlzZ2xvaWRlcmlwd3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDI4MzMsImV4cCI6MjA4NjkxODgzM30._cxWUqSea1xQpAEp-xstWO4V-oJeKj_Q6NFz4raV5no';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
