import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  type LoginPayload,
  type RegisterPayload,
  type User,
} from "../services/authService";
import { createGuestSession, type GuestSession } from "../services/guestService";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestSession: GuestSession | null;
  guestSessionToken: string | null;
  preferredLanguage: string;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<string>;
  continueAsGuest: (saveProgress: boolean, preferredLanguage: string) => Promise<void>;
  logout: () => void;
};

const TOKEN_KEY = "assist_ai_token";
const USER_KEY = "assist_ai_user";
const GUEST_KEY = "assist_ai_guest_session";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    return storedUser ? (JSON.parse(storedUser) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [guestSession, setGuestSession] = useState<GuestSession | null>(() => {
    const storedGuest = localStorage.getItem(GUEST_KEY);
    return storedGuest ? (JSON.parse(storedGuest) as GuestSession) : null;
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      });
  }, [token]);

  const clearGuest = () => {
    localStorage.removeItem(GUEST_KEY);
    setGuestSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isGuest: Boolean(guestSession),
      guestSession,
      guestSessionToken: guestSession?.guest_session_token ?? null,
      preferredLanguage:
        user?.preferred_language ?? guestSession?.preferred_language ?? "en",
      login: async (payload) => {
        const response = await loginUser(payload);
        localStorage.setItem(TOKEN_KEY, response.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        localStorage.removeItem(GUEST_KEY);
        setToken(response.access_token);
        setUser(response.user);
        setGuestSession(null);
        return response.user;
      },
      register: async (payload) => {
        const response = await registerUser(payload);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(GUEST_KEY);
        setToken(null);
        setUser(null);
        setGuestSession(null);
        return response.message;
      },
      continueAsGuest: async (saveProgress, preferredLanguage) => {
        const response = await createGuestSession({
          save_progress: saveProgress,
          preferred_language: preferredLanguage,
        });
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.setItem(GUEST_KEY, JSON.stringify(response));
        setToken(null);
        setUser(null);
        setGuestSession(response);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        clearGuest();
      },
    }),
    [guestSession, token, user],
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
