import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  updatePreferredLanguage,
  type LoginPayload,
  type RegisterPayload,
  type User,
} from "../services/authService";
import { createGuestSession, type GuestSession } from "../services/guestService";
import { clearComputerVisionConsent, readComputerVisionConsent, saveComputerVisionConsent } from "../lib/computerVisionConsent";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  guestSession: GuestSession | null;
  guestSessionToken: string | null;
  preferredLanguage: string;
  computerVisionConsent: boolean | null;
  chooseComputerVisionConsent: (allowed: boolean) => void;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<string>;
  continueAsGuest: (saveProgress: boolean, preferredLanguage: string) => Promise<void>;
  setPreferredLanguage: (preferredLanguage: string) => Promise<User>;
  logout: () => void;
};

const TOKEN_KEY = "assist_ai_token";
const USER_KEY = "assist_ai_user";
const GUEST_KEY = "assist_ai_guest_session";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [computerVisionConsent, setComputerVisionConsent] = useState<boolean | null>(() => readComputerVisionConsent());
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    return storedUser ? (JSON.parse(storedUser) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [guestSession, setGuestSession] = useState<GuestSession | null>(() => {
    const storedGuest = localStorage.getItem(GUEST_KEY);
    return storedGuest ? (JSON.parse(storedGuest) as GuestSession) : null;
  });

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    fetchCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        if (!active) return;
        clearComputerVisionConsent();
        setComputerVisionConsent(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== TOKEN_KEY && event.key !== null)) return;
      clearComputerVisionConsent();
      setComputerVisionConsent(null);
      setUser(null);
      const nextToken = localStorage.getItem(TOKEN_KEY);
      setToken(nextToken);
      setGuestSession(null);
      setIsLoading(Boolean(nextToken));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const clearGuest = () => {
    localStorage.removeItem(GUEST_KEY);
    setGuestSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      isGuest: Boolean(guestSession),
      guestSession,
      guestSessionToken: guestSession?.guest_session_token ?? null,
      preferredLanguage:
        user?.preferred_language ?? guestSession?.preferred_language ?? "en",
      computerVisionConsent,
      chooseComputerVisionConsent: (allowed) => {
        if (!token || !user) return;
        saveComputerVisionConsent(allowed, token);
        setComputerVisionConsent(allowed);
      },
      login: async (payload) => {
        const response = await loginUser(payload);
        clearComputerVisionConsent();
        setComputerVisionConsent(null);
        localStorage.setItem(TOKEN_KEY, response.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        localStorage.removeItem(GUEST_KEY);
        setToken(response.access_token);
        setUser(response.user);
        setGuestSession(null);
        setIsLoading(false);
        return response.user;
      },
      register: async (payload) => {
        const response = await registerUser(payload);
        clearComputerVisionConsent();
        setComputerVisionConsent(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(GUEST_KEY);
        setToken(null);
        setUser(null);
        setGuestSession(null);
        setIsLoading(false);
        return response.message;
      },
      continueAsGuest: async (saveProgress, preferredLanguage) => {
        const response = await createGuestSession({
          save_progress: saveProgress,
          preferred_language: preferredLanguage,
        });
        clearComputerVisionConsent();
        setComputerVisionConsent(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.setItem(GUEST_KEY, JSON.stringify(response));
        setToken(null);
        setUser(null);
        setGuestSession(response);
        setIsLoading(false);
      },
      setPreferredLanguage: async (preferredLanguage) => {
        const updatedUser = await updatePreferredLanguage(preferredLanguage);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
        return updatedUser;
      },
      logout: () => {
        clearComputerVisionConsent();
        setComputerVisionConsent(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        setIsLoading(false);
        clearGuest();
      },
    }),
    [computerVisionConsent, guestSession, isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
