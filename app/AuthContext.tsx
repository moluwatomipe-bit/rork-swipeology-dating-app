import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { Session, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  first_name: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  major: string | null;
  class_year: string | null;
  interests: string | null;
  pronouns: string | null;
  dating_preference: string | null;
  wants_friends: boolean | null;
  wants_dating: boolean | null;
  phone_number: string | null;
  school_email: string | null;
  university: string | null;
  is_verified_esu: boolean | null;
  phone_verified: boolean | null;
  blocked_users: string[];
  photos: string[];
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }

      setLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      setProfile(null);
      return;
    }

    // SAFELY convert null → arrays to prevent crashes
    setProfile({
      ...data,
      blocked_users: data.blocked_users ?? [],
      photos: data.photos ?? [],
    });
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
