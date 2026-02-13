import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { User, OnboardingStep } from '@/types';

const STORAGE_KEY_USER = '@swipeology_user';
const STORAGE_KEY_ONBOARDING = '@swipeology_onboarding';

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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
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
    isLoading: loadStoredData.isLoading,
  };
});
