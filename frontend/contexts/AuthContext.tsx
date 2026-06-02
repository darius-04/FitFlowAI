import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { api, getToken, setToken, clearToken } from "../lib/api";

export type User = {
  id: string;
  email: string;
  name: string;
  has_profile: boolean;
};

type AuthContextValue = {
  user: User | null | undefined; // undefined = se verifică, null = delogat
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();

  // Verifică dacă există un user logat la pornirea aplicației
  const refreshUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const u = await api.get<User>("/auth/me");
      setUser(u);
    } catch (err) {
      // Dacă token-ul este expirat sau invalid (eroare 401), curățăm tot
      await clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.post<{ user: User; access_token: string; refresh_token: string }>(
        "/auth/login",
        { email, password },
        { auth: false }
      );

      // Salvăm token-ul în AsyncStorage și în header-ul axios
      await setToken(data.access_token, data.refresh_token);
      setUser(data.user);

      // Navigăm către ecranul principal (tabs)
      router.replace("/(tabs)");
    } catch (error) {
      throw error; // Trimitem eroarea mai departe către componenta de Login (pentru Alert)
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const data = await api.post<{ user: User; access_token: string; refresh_token: string }>(
        "/auth/register",
        { email, password, name },
        { auth: false }
      );

      await setToken(data.access_token, data.refresh_token);
      setUser(data.user);

      // Dacă e cont nou, trimitem la onboarding
      router.replace("/onboarding");
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // 1. Încercăm să anunțăm backend-ul (opțional)
      await api.post("/auth/logout", {}).catch(() => null);

      // 2. Curățăm token-ul local indiferent dacă apelul la server a reușit sau nu
      await clearToken();

      // 3. Resetăm starea globală a user-ului
      setUser(null);

      // 4. Forțăm navigarea către ecranul de login
      router.replace("/login");

      console.log("User logged out and redirected");
    } catch (e) {
      console.error("Error during signOut:", e);
      // Fallback: ne asigurăm că userul e deconectat local chiar dacă apare o eroare de execuție
      await clearToken();
      setUser(null);
      router.replace("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}