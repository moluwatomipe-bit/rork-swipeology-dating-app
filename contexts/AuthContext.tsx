import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabase';
import { User, OnboardingStep } from '@/types';
import type { Session } from '@supabase/supabase-js';

const STORAGE_KEY_USER = '@swipeology_user';
const STORAGE_KEY_ONBOARDING = '@swipeology_onboarding';
const STORAGE_KEY_REPORTS = '@swipeology_reports';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileChecked, setProfileChecked] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    console.log('[Auth] Checking users table for user:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('[Auth] Profile lookup error:', error.message);
        return null;
      }

      if (data) {
        console.log('[Auth] Profile found for user:', userId);
        const profile: User = {
          id: data.id ?? userId,
          phone_number: data.phone_number ?? '',
          phone_verified: data.phone_verified ?? false,
          school_email: data.school_email ?? '',
          password: '',
          university: data.university ?? '',
          is_verified_esu: data.is_verified_esu ?? false,
          first_name: data.first_name ?? '',
          age: data.age ?? 0,
          gender: data.gender ?? 'prefer not to say',
          pronouns: data.pronouns ?? '',
          dating_preference: data.dating_preference ?? 'both',
          wants_friends: data.wants_friends ?? false,
          wants_dating: data.wants_dating ?? false,
          photo1_url: data.photo1_url ?? '',
          photo2_url: data.photo2_url ?? '',
          photo3_url: data.photo3_url ?? '',
          photo4_url: data.photo4_url ?? '',
          photo5_url: data.photo5_url ?? '',
          photo6_url: data.photo6_url ?? '',
          bio: data.bio ?? '',
          major: data.major ?? '',
          class_year: data.class_year ?? '',
          interests: data.interests ?? '',
          blocked_users: data.blocked_users ?? [],
        };
        return profile;
      }

      console.log('[Auth] No profile found for user:', userId);
      return null;
    } catch (err) {
      console.log('[Auth] Profile fetch exception:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[Auth] Initial session:', s?.user?.email ?? 'none');
      setSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[Auth] Auth state changed:', _event, s?.user?.email ?? 'none');
      setSession(s);
      if (!s) {
        setHasProfile(null);
        setProfileChecked(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfileChecked(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const profile = await fetchProfile(session.user.id);
      if (cancelled) return;

      if (profile) {
        setCurrentUser(profile);
        setHasProfile(true);
        setOnboardingStep('complete');
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
        await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, 'complete');
        console.log('[Auth] Profile loaded from Supabase, skipping onboarding');
      } else {
        setHasProfile(false);
        console.log('[Auth] No profile in Supabase, user needs onboarding');
      }
      setProfileChecked(true);
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id, fetchProfile]);

  const loadStoredData = useQuery({
    queryKey: ['auth', 'stored'],
    queryFn: async () => {
      const [userStr, stepStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_USER),
        AsyncStorage.getItem(STORAGE_KEY_ONBOARDING),
      ]);
      return {
        user: userStr ? (JSON.parse(userStr) as User) : null,
        step: (stepStr as OnboardingStep) || 'welcome',
      };
    },
  });

  useEffect(() => {
    if (loadStoredData.data && profileChecked) {
      if (!currentUser && !hasProfile) {
        const user = loadStoredData.data.user;
        if (user) {
          if (user.phone_verified === undefined) user.phone_verified = false;
          if (user.pronouns === undefined) user.pronouns = '';
          if (user.blocked_users === undefined) user.blocked_users = [];
          setCurrentUser(user);
        }
        if (!hasProfile) {
          setOnboardingStep(loadStoredData.data.step);
        }
      }
      setIsReady(true);
    }
  }, [loadStoredData.data, profileChecked, hasProfile, currentUser]);

  const saveUserMutation = useMutation({
    mutationFn: async (user: User) => {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return user;
    },
    onSuccess: (user) => {
      setCurrentUser(user);
      queryClient.invalidateQueries({ queryKey: ['auth', 'stored'] });
    },
  });

  const saveOnboardingStepMutation = useMutation({
    mutationFn: async (step: OnboardingStep) => {
      await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, step);
      return step;
    },
    onSuccess: (step) => {
      setOnboardingStep(step);
    },
  });

  const { mutate: saveUser } = saveUserMutation;

  const updateUser = useCallback((updates: Partial<User>) => {
    const updated = { ...currentUser, ...updates } as User;
    if (updated.blocked_users === undefined) updated.blocked_users = [];
    if (updated.phone_verified === undefined) updated.phone_verified = false;
    if (updated.pronouns === undefined) updated.pronouns = '';
    setCurrentUser(updated);
    saveUser(updated);

    if (session?.user?.id) {
      const syncData: Record<string, unknown> = { ...updates };
      delete syncData.password;
      delete syncData.id;
      console.log('[Auth] Syncing user updates to Supabase:', Object.keys(syncData));
      supabase
        .from('users')
        .update(syncData)
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) {
            console.log('[Auth] Supabase sync error:', error.message);
          } else {
            console.log('[Auth] User updates synced to Supabase');
          }
        });
    }
  }, [currentUser, saveUser, session?.user?.id]);

  const { mutate: saveStep } = saveOnboardingStepMutation;

  const goToStep = useCallback((step: OnboardingStep) => {
    setOnboardingStep(step);
    saveStep(step);
  }, [saveStep]);

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password: pw }: { email: string; password: string }) => {
      console.log('[Auth] Signing up with Supabase:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
      });
      if (error) {
        console.log('[Auth] Signup error:', error.message);
        throw new Error(error.message);
      }
      console.log('[Auth] Signup success:', data.user?.id);
      return data;
    },
  });

  const signUp = useCallback(async (email: string, pw: string) => {
    return signUpMutation.mutateAsync({ email, password: pw });
  }, [signUpMutation]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password: pw }: { email: string; password: string }) => {
      console.log('[Auth] Signing in with Supabase:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });
      if (error) {
        console.log('[Auth] Login error:', error.message);
        throw new Error(error.message);
      }
      console.log('[Auth] Login success:', data.user?.id);

      const profile = await fetchProfile(data.user.id);
      if (profile) {
        setCurrentUser(profile);
        setHasProfile(true);
        setOnboardingStep('complete');
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
        await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, 'complete');
        console.log('[Auth] Login: profile found, skipping onboarding');
        return { hasProfile: true };
      }

      setHasProfile(false);
      setProfileChecked(true);
      console.log('[Auth] Login: no profile, needs onboarding');
      return { hasProfile: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'stored'] });
    },
  });

  const { mutateAsync: doLogin } = loginMutation;

  const login = useCallback(async (email: string, pw: string) => {
    return doLogin({ email, password: pw });
  }, [doLogin]);

  const completeRegistration = useCallback(async (user: User) => {
    console.log('[Auth] Completing registration for:', user.school_email);
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, 'complete');
    setCurrentUser(user);
    setHasProfile(true);
    setProfileChecked(true);
    setOnboardingStep('complete');
    console.log('[Auth] Registration complete, hasProfile set to true');
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      console.log('[Auth] refreshProfile: no session user');
      return;
    }
    console.log('[Auth] refreshProfile for:', userId);
    const profile = await fetchProfile(userId);
    if (profile) {
      setCurrentUser(profile);
      setHasProfile(true);
      setOnboardingStep('complete');
      setProfileChecked(true);
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
      await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, 'complete');
      console.log('[Auth] refreshProfile: profile loaded successfully');
    } else {
      console.log('[Auth] refreshProfile: no profile found');
    }
  }, [session?.user?.id, fetchProfile]);

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      console.log('[Auth] Sending password reset to:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.log('[Auth] Reset password error:', error.message);
        throw new Error(error.message);
      }
      console.log('[Auth] Password reset email sent');
      return true;
    },
  });

  const resetPassword = useCallback(async (email: string) => {
    return resetPasswordMutation.mutateAsync({ email });
  }, [resetPasswordMutation]);

  const verifyPhoneMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('No user');
      const updated = { ...currentUser, phone_verified: true };
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setCurrentUser(updated);
    },
  });

  const { mutateAsync: doVerifyPhone } = verifyPhoneMutation;

  const verifyPhone = useCallback(async () => {
    return doVerifyPhone();
  }, [doVerifyPhone]);

  const changePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      console.log('[Auth] Changing password via Supabase');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.log('[Auth] Change password error:', error.message);
        throw new Error(error.message);
      }
      if (!currentUser) throw new Error('No user');
      const updated = { ...currentUser, password: newPassword };
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setCurrentUser(updated);
    },
  });

  const { mutateAsync: doChangePassword } = changePasswordMutation;

  const changePassword = useCallback(async (newPassword: string) => {
    return doChangePassword({ newPassword });
  }, [doChangePassword]);

  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentUser) throw new Error('No user');
      const blocked = [...(currentUser.blocked_users || [])];
      if (!blocked.includes(userId)) {
        blocked.push(userId);
      }
      const updated = { ...currentUser, blocked_users: blocked };
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setCurrentUser(updated);
    },
  });

  const { mutateAsync: doBlockUser } = blockUserMutation;

  const blockUser = useCallback(async (userId: string) => {
    return doBlockUser(userId);
  }, [doBlockUser]);

  const reportUserMutation = useMutation({
    mutationFn: async ({ reportedId, reason, matchId }: { reportedId: string; reason: string; matchId: string | null }) => {
      if (!currentUser) throw new Error('No user');
      const existingStr = await AsyncStorage.getItem(STORAGE_KEY_REPORTS);
      const reports = existingStr ? JSON.parse(existingStr) : [];
      reports.push({
        id: `report_${Date.now()}`,
        reporter_id: currentUser.id,
        reported_id: reportedId,
        match_id: matchId,
        reason,
        reported_at: new Date().toISOString(),
      });
      await AsyncStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
      return true;
    },
  });

  const { mutateAsync: doReportUser } = reportUserMutation;

  const reportUser = useCallback(async (reportedId: string, reason: string, matchId: string | null) => {
    return doReportUser({ reportedId, reason, matchId });
  }, [doReportUser]);

  const lookupAccountByEmail = useCallback(async (_email: string): Promise<{ phone_number: string } | null> => {
    return { phone_number: '' };
  }, []);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Deleting account from Supabase Auth and local storage');
      const { error } = await supabase.rpc('delete_user');
      if (error) {
        console.log('[Auth] Supabase delete_user RPC error:', error.message);
      } else {
        console.log('[Auth] User deleted from Supabase Auth');
      }
      await AsyncStorage.multiRemove([STORAGE_KEY_USER, STORAGE_KEY_ONBOARDING, '@swipeology_swipes', '@swipeology_matches', '@swipeology_messages']);
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      setCurrentUser(null);
      setSession(null);
      setOnboardingStep('welcome');
      setHasProfile(null);
      setProfileChecked(false);
      queryClient.clear();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Logging out');
      await AsyncStorage.multiRemove([STORAGE_KEY_USER, STORAGE_KEY_ONBOARDING]);
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      setCurrentUser(null);
      setSession(null);
      setOnboardingStep('welcome');
      setHasProfile(null);
      setProfileChecked(false);
      queryClient.clear();
    },
  });

  const { mutate: doLogout } = logoutMutation;

  const logout = useCallback(() => {
    doLogout();
  }, [doLogout]);

  const { mutate: doDelete } = deleteAccountMutation;

  const deleteAccount = useCallback(() => {
    doDelete();
  }, [doDelete]);

  return {
    currentUser,
    session,
    onboardingStep,
    isReady,
    updateUser,
    goToStep,
    logout,
    deleteAccount,
    login,
    signUp,
    completeRegistration,
    verifyPhone,
    changePassword,
    blockUser,
    reportUser,
    lookupAccountByEmail,
    resetPassword,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    signUpError: signUpMutation.error?.message ?? null,
    isLoading: loadStoredData.isLoading,
    hasProfile,
    profileChecked,
    refreshProfile,
  };
});
