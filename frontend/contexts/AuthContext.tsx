import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, clearToken } from "../lib/api";

export type User = {
  id: string;
  email: string;
  name: string;
  has_profile: boolean;
};

type AuthContextValue = {
  user: User | null | undefined; // undefined = checking, null = signed out
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refreshUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const u = await api.get<User>("/auth/me");
      setUser(u);
    } catch {
      await clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = async (email: string, password: string) => {
    const data = await api.post<{ user: User; access_token: string; refresh_token: string }>(
      "/auth/login",
      { email, password },
      { auth: false }
    );
    await setToken(data.access_token, data.refresh_token);
    setUser(data.user);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const data = await api.post<{ user: User; access_token: string; refresh_token: string }>(
      "/auth/register",
      { email, password, name },
      { auth: false }
    );
    await setToken(data.access_token, data.refresh_token);
    setUser(data.user);
  };

  const signOut = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {}
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
