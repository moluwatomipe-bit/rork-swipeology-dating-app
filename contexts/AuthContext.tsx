import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { User, OnboardingStep } from '@/types';

const STORAGE_KEY_USER = '@swipeology_user';
const STORAGE_KEY_ONBOARDING = '@swipeology_onboarding';
const STORAGE_KEY_ACCOUNTS = '@swipeology_accounts';

interface StoredAccount {
  email: string;
  password: string;
  user: User;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [isReady, setIsReady] = useState<boolean>(false);
  const queryClient = useQueryClient();

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
    if (loadStoredData.data) {
      setCurrentUser(loadStoredData.data.user);
      setOnboardingStep(loadStoredData.data.step);
      setIsReady(true);
    }
  }, [loadStoredData.data]);

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

  const registerAccountMutation = useMutation({
    mutationFn: async (account: StoredAccount) => {
      const existingStr = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNTS);
      const accounts: StoredAccount[] = existingStr ? JSON.parse(existingStr) : [];
      const idx = accounts.findIndex((a) => a.email.toLowerCase() === account.email.toLowerCase());
      if (idx >= 0) {
        accounts[idx] = account;
      } else {
        accounts.push(account);
      }
      await AsyncStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
      return account;
    },
  });

  const { mutate: saveUser } = saveUserMutation;

  const updateUser = useCallback((updates: Partial<User>) => {
    const updated = { ...currentUser, ...updates } as User;
    setCurrentUser(updated);
    saveUser(updated);
  }, [currentUser, saveUser]);

  const { mutate: saveStep } = saveOnboardingStepMutation;

  const goToStep = useCallback((step: OnboardingStep) => {
    setOnboardingStep(step);
    saveStep(step);
  }, [saveStep]);

  const { mutateAsync: registerAccount } = registerAccountMutation;

  const completeRegistration = useCallback(async (user: User) => {
    if (user.school_email && user.password) {
      await registerAccount({
        email: user.school_email.toLowerCase(),
        password: user.password,
        user,
      });
      console.log('Account registered for:', user.school_email);
    }
  }, [registerAccount]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const existingStr = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNTS);
      const accounts: StoredAccount[] = existingStr ? JSON.parse(existingStr) : [];
      const account = accounts.find(
        (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
      );
      if (!account) {
        throw new Error('Invalid email or password. Please try again.');
      }
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(account.user));
      await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, 'complete');
      return account.user;
    },
    onSuccess: (user) => {
      setCurrentUser(user);
      setOnboardingStep('complete');
      queryClient.invalidateQueries({ queryKey: ['auth', 'stored'] });
    },
  });

  const { mutateAsync: doLogin } = loginMutation;

  const login = useCallback(async (email: string, password: string) => {
    return doLogin({ email, password });
  }, [doLogin]);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const email = currentUser?.school_email?.toLowerCase();
      if (email) {
        const existingStr = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNTS);
        const accounts: StoredAccount[] = existingStr ? JSON.parse(existingStr) : [];
        const filtered = accounts.filter((a) => a.email.toLowerCase() !== email);
        await AsyncStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(filtered));
      }
      await AsyncStorage.multiRemove([STORAGE_KEY_USER, STORAGE_KEY_ONBOARDING, '@swipeology_swipes', '@swipeology_matches', '@swipeology_messages']);
    },
    onSuccess: () => {
      setCurrentUser(null);
      setOnboardingStep('welcome');
      queryClient.clear();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (currentUser?.school_email && currentUser?.password) {
        const existingStr = await AsyncStorage.getItem(STORAGE_KEY_ACCOUNTS);
        const accounts: StoredAccount[] = existingStr ? JSON.parse(existingStr) : [];
        const idx = accounts.findIndex(
          (a) => a.email.toLowerCase() === currentUser.school_email.toLowerCase()
        );
        if (idx >= 0) {
          accounts[idx].user = currentUser;
          await AsyncStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
        }
      }
      await AsyncStorage.multiRemove([STORAGE_KEY_USER, STORAGE_KEY_ONBOARDING]);
    },
    onSuccess: () => {
      setCurrentUser(null);
      setOnboardingStep('welcome');
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
    onboardingStep,
    isReady,
    updateUser,
    goToStep,
    logout,
    deleteAccount,
    login,
    completeRegistration,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    isLoading: loadStoredData.isLoading,
  };
});
