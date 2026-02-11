import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';

const STORAGE_KEY_NOTIF = '@swipeology_notifications_enabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const storedState = useQuery({
    queryKey: ['notifications', 'enabled'],
    queryFn: async () => {
      const val = await AsyncStorage.getItem(STORAGE_KEY_NOTIF);
      return val === 'true';
    },
  });

  useEffect(() => {
    if (storedState.data !== undefined) {
      setIsEnabled(storedState.data);
    }
  }, [storedState.data]);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not fully supported on web');
        setIsEnabled(true);
        await AsyncStorage.setItem(STORAGE_KEY_NOTIF, 'true');
        return true;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#9B6DFF',
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      setExpoPushToken(tokenData.data);
      console.log('Push token:', tokenData.data);

      setIsEnabled(true);
      await AsyncStorage.setItem(STORAGE_KEY_NOTIF, 'true');
      return true;
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
      return false;
    }
  }, []);

  const scheduleMatchNotification = useCallback(async (matchedUserName: string, context: 'friends' | 'dating') => {
    if (!isEnabled) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "It's a match! 🎉",
          body: context === 'friends'
            ? `You and ${matchedUserName} both want to be friends!`
            : `You and ${matchedUserName} matched!`,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.log('Error scheduling match notification:', error);
    }
  }, [isEnabled]);

  const scheduleMessageNotification = useCallback(async (senderName: string, messagePreview: string) => {
    if (!isEnabled) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: senderName,
          body: messagePreview.length > 100 ? messagePreview.slice(0, 97) + '...' : messagePreview,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.log('Error scheduling message notification:', error);
    }
  }, [isEnabled]);

  return {
    expoPushToken,
    isEnabled,
    requestPermissions,
    scheduleMatchNotification,
    scheduleMessageNotification,
  };
});
