import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase, API_BASE, publicAnonKey } from "./supabase";

/* ═══════════════════════════════════
   TYPES — Frontend plan naming
   Server stores: free | generate | studio
   Frontend displays: free | pro | business
   ═══════════════════════════════════ */

export type PlanTier = "free" | "starter" | "pro" | "business";
export type UserRole = "user" | "admin";

/** Map server plan names to frontend plan names.
 *  The server emits both the public-facing names (creator/studio/agency)
 *  and the legacy Stripe-dashboard names (starter/pro/business). The
 *  client still works in the legacy set internally — this map funnels
 *  both conventions into it. */
function mapServerPlan(serverPlan: string): PlanTier {
  const s = (serverPlan || "").toLowerCase();
  if (s === "creator" || s === "starter") return "starter";
  if (s === "studio"  || s === "pro" || s === "generate") return "pro";
  if (s === "agency"  || s === "business") return "business";
  return "free";
}

/** Map frontend plan names back to server plan names (for API calls) */
export function mapToServerPlan(plan: PlanTier): string {
  return plan; // Plans now use same names on server and client
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  plan: PlanTier;
  credits: number;
  creditsUsed: number;
  company?: string;
  jobTitle?: string;
  createdAt: string;
  lastLoginAt: string;
}

/* ═══════════════════════════════════
   ACCESS CONTROL HELPERS
   ═══════════════════════════════════ */

/** What each plan tier can access. Source of truth: PricingPage.tsx.
 *  - Creator (=starter) €19: 60 assets, NO Brand Vault — just text brief.
 *  - Studio  (=pro)     €49: 200 assets, Brand Vault unlocked.
 *  - Agency  (=business) €199: 1000 assets, multi-brand Vault + API. */
const PLAN_ACCESS = {
  free:     { hub: true, vault: false, analytics: false, campaignLab: false },
  starter:  { hub: true, vault: false, analytics: true,  campaignLab: true  },
  pro:      { hub: true, vault: true,  analytics: true,  campaignLab: true  },
  business: { hub: true, vault: true,  analytics: true,  campaignLab: true  },
} as const;

export type Feature = keyof (typeof PLAN_ACCESS)["free"];

export function canAccess(plan: PlanTier, feature: Feature, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return PLAN_ACCESS[plan]?.[feature] ?? false;
}

/** Get the minimum plan required for a feature */
export function requiredPlan(feature: Feature): PlanTier {
  if (PLAN_ACCESS.free[feature]) return "free";
  if (PLAN_ACCESS.starter[feature]) return "starter";
  if (PLAN_ACCESS.pro[feature]) return "pro";
  return "business";
}

/* ═══════════════════════════════════
   AUTH CONTEXT
   ═══════════════════════════════════ */

interface AuthState {
  user: { id: string; email: string; name?: string } | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  plan: PlanTier;
  remainingCredits: number;
  accessToken: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getAuthHeader: () => string;
  can: (feature: Feature) => boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  plan: "free",
  remainingCredits: 0,
  accessToken: null,
  signOut: async () => {},
  refreshProfile: async () => {},
  getAuthHeader: () => "",
  can: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const signingOut = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  // Tracks the last token we fetched a profile for. Prevents duplicate
  // profile fetches when Supabase fires INITIAL_SESSION + TOKEN_REFRESHED
  // events for the same session, which used to thrash the network during
  // long-running flows (Surprise Me polling, Campaign Lab generation).
  const lastFetchedTokenRef = useRef<string | null>(null);

  const clearAuthState = useCallback(() => {
    currentUserIdRef.current = null;
    lastFetchedTokenRef.current = null;
    setUser(null);
    setProfile(null);
    setAccessToken(null);
  }, []);

  const normalizeProfile = useCallback((raw: any): UserProfile => {
    return {
      ...raw,
      plan: mapServerPlan(raw.plan || "free"),
    };
  }, []);

  const fetchProfile = useCallback(async (token: string): Promise<UserProfile | null> => {
    if (signingOut.current) return null;

    const t0 = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      console.log("[fetchProfile] trying POST /auth/me with text/plain (CORS-safe)...");
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ _token: token }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      console.log(`[fetchProfile] status=${res.status} authenticated=${data.authenticated} (${Date.now() - t0}ms)`);
      if (data.authenticated && data.profile) {
        if (!signingOut.current) {
          const normalized = normalizeProfile(data.profile);
          setProfile(normalized);
          return normalized;
        }
      }
    } catch (err) {
      console.log(`[fetchProfile] fetch failed: ${err instanceof Error ? err.message : err}`);
    }

    console.log(`[fetchProfile] server fetch failed after ${Date.now() - t0}ms, using JWT fallback`);
    // Last resort: decode JWT locally to create a minimal profile
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload?.sub && payload?.email && !signingOut.current) {
          const isAdminEmail = payload.email.toLowerCase() === "romainortel@gmail.com";
          const fallbackProfile: UserProfile = {
            userId: payload.sub,
            email: payload.email,
            name: payload.user_metadata?.name || payload.email.split("@")[0],
            role: isAdminEmail ? "admin" : "user",
            plan: isAdminEmail ? "business" : "free",
            credits: isAdminEmail ? 999999 : 50,
            creditsUsed: 0,
            company: "",
            jobTitle: "",
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          console.log("fetchProfile: using JWT fallback profile");
          setProfile(fallbackProfile);
          return fallbackProfile;
        }
      }
    } catch (e2) { /* ignore JWT decode failure */ }
    return null;
  }, [normalizeProfile]);

  const refreshProfile = useCallback(async () => {
    if (accessToken && !signingOut.current) {
      // Caller explicitly asked for a fresh profile (e.g. after a
      // generation that consumed credits). Mark this token as fetched
      // so the next onAuthStateChange dedup check is correct.
      lastFetchedTokenRef.current = accessToken;
      await fetchProfile(accessToken);
    }
  }, [accessToken, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Hydrate from the persisted session once. onAuthStateChange will also
    // fire INITIAL_SESSION right after subscribing, so we use
    // `lastFetchedTokenRef` below to skip the duplicate profile fetch.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted || signingOut.current) return;
      if (data.session?.user) {
        const u = data.session.user;
        const tok = data.session.access_token;
        currentUserIdRef.current = u.id;
        setUser({
          id: u.id,
          email: u.email ?? "",
          name: (u.user_metadata as any)?.name ?? (u.user_metadata as any)?.full_name ?? "",
        });
        setAccessToken(tok);
        lastFetchedTokenRef.current = tok;
        // Wait for profile before marking loading as done
        await fetchProfile(tok);
      }
      if (mounted) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log("[Auth] onAuthStateChange event:", event);

      if (event === "SIGNED_OUT" || signingOut.current) {
        clearAuthState();
        if (mounted) setIsLoading(false);
        return;
      }

      if (!session?.user) {
        clearAuthState();
        if (mounted) setIsLoading(false);
        return;
      }

      const u = session.user;
      const tok = session.access_token;
      const previousUserId = currentUserIdRef.current;
      const userChanged = previousUserId !== null && previousUserId !== u.id;

      if (userChanged) {
        console.log("[Auth] User changed from", previousUserId, "to", u.id, "-- clearing stale profile");
        setProfile(null);
        lastFetchedTokenRef.current = null;
      }

      currentUserIdRef.current = u.id;
      setUser({
        id: u.id,
        email: u.email ?? "",
        name: (u.user_metadata as any)?.name ?? (u.user_metadata as any)?.full_name ?? "",
      });
      // Only update accessToken state when the value actually changed.
      // Re-setting the same string would still rerun any consumer effect
      // that depends on `accessToken` (Surprise Me progress poller),
      // canceling and restarting the interval on every TOKEN_REFRESHED.
      setAccessToken((prev) => (prev === tok ? prev : tok));

      // Decide whether a profile refetch is warranted. TOKEN_REFRESHED
      // produces a new JWT for the same user — no profile data has
      // changed, so we keep the existing one. INITIAL_SESSION right
      // after mount is a duplicate of the getSession() bootstrap above
      // (we already fetched for this exact token).
      const isTokenRefresh = event === "TOKEN_REFRESHED";
      const alreadyFetched = lastFetchedTokenRef.current === tok;
      const shouldFetch = userChanged || (!isTokenRefresh && !alreadyFetched);

      if (shouldFetch) {
        lastFetchedTokenRef.current = tok;
        fetchProfile(tok);
      } else {
        console.log(`[Auth] skipping profile fetch (event=${event}, userChanged=${userChanged}, alreadyFetched=${alreadyFetched})`);
      }

      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, clearAuthState]);

  const signOut = useCallback(async () => {
    console.log("[Auth] signOut called");
    signingOut.current = true;
    clearAuthState();

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[Auth] signOut error:", err);
    }

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("[Auth] localStorage cleanup error:", e);
    }

    setTimeout(() => {
      signingOut.current = false;
    }, 500);
  }, [clearAuthState]);

  const getAuthHeader = useCallback(() => {
    return accessToken || "";
  }, [accessToken]);

  const isAdmin = profile?.role === "admin";
  const plan: PlanTier = profile?.plan || "free";
  const remainingCredits = isAdmin ? 999999 : Math.max(0, (profile?.credits || 0) - (profile?.creditsUsed || 0));
  const can = useCallback((feature: Feature) => canAccess(plan, feature, isAdmin), [plan, isAdmin]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      isAdmin,
      plan,
      remainingCredits,
      accessToken,
      signOut,
      refreshProfile,
      getAuthHeader,
      can,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}