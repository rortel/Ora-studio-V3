import { supabase, API_BASE, publicAnonKey } from "../lib/supabase";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { OraLogo } from "../components/OraLogo";
import { ArrowRight, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { trackEvent } from "../lib/analytics";

const ADMIN_EMAIL = "romainortel@gmail.com";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Respect `?next=` so pricing/signup CTAs survive the auth detour.
  // Falls back to /hub/surprise (free-trial landing with 10 credits) so
  // new signups taste the product immediately instead of being parked on
  // /profile or /onboarding. Admins still go to /admin.
  const nextParam = searchParams.get("next") || "";
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : "";
  const postAuthTarget = (userEmail: string) => {
    if (userEmail.toLowerCase() === ADMIN_EMAIL) return "/admin";
    return safeNext || "/hub/surprise";
  };

  // If already authenticated, redirect based on role (respecting ?next).
  useEffect(() => {
    if (!authLoading && user) {
      if (profile?.role === "admin" || user.email.toLowerCase() === ADMIN_EMAIL) {
        navigate("/admin");
      } else {
        navigate(safeNext || "/profile");
      }
    }
  }, [authLoading, user, profile, navigate, safeNext]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        console.error("Sign in error:", authError.message);
        if (authError.message === "Invalid login credentials") {
          setError(t("login.errorInvalidCredentials"));
        } else {
          setError(authError.message);
        }
        return;
      }
      console.log("Signed in:", data.session?.user?.id);
      const userEmail = data.session?.user?.email || "";
      // Funnel signal: a returning user successfully signed in.
      trackEvent("login_completed", { method: "password" });
      navigate(postAuthTarget(userEmail));
    } catch (err) {
      console.error("Sign in exception:", err);
      setError(t("login.errorUnexpected"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout for signup
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ email, password, name, _token: "" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.error) {
        console.error("Signup error:", data.error);
        if (data.error.includes("already been registered") || data.error.includes("already exists")) {
          setError(t("login.errorAlreadyRegistered"));
        } else {
          setError(data.error);
        }
        return;
      }

      // Auto sign-in after signup
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Auto sign-in after signup failed:", signInError.message);
        setSuccess(t("login.successAccountCreated"));
        setMode("signin");
        return;
      }

      console.log("Signed up and in:", signInData.session?.user?.id);
      // Funnel signal: a brand-new account just got created. The
      // distinction between login_completed (returning user) and
      // signup_completed (new user) is what powers the dashboard's
      // "today's new signups" line.
      trackEvent("signup_completed", { hasName: !!name });
      const userEmail = signInData.session?.user?.email || email;
      navigate(postAuthTarget(userEmail));
    } catch (err: any) {
      console.error("Signup exception:", err);
      if (err?.name === "AbortError") {
        setError(t("login.errorColdStart"));
      } else {
        setError(t("login.errorUnexpected"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) {
        console.error("Reset password error:", resetError.message);
        setError(resetError.message);
      } else {
        setSuccess(t("login.successResetSent"));
      }
    } catch (err) {
      console.error("Reset password exception:", err);
      setError(t("login.errorResetFailed"));
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      console.log("[GoogleAuth] Starting signInWithOAuth...");
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/profile`,
          skipBrowserRedirect: true,
        },
      });
      console.log("[GoogleAuth] Response:", { url: data?.url, error: oauthError?.message });
      if (oauthError) {
        console.error("Google OAuth error:", oauthError.message);
        if (oauthError.message.includes("provider is not enabled")) {
          setError(t("login.errorGoogleNotConfigured"));
        } else {
          setError(oauthError.message);
        }
        setLoading(false);
        return;
      }
      if (data?.url) {
        console.log("[GoogleAuth] Opening auth URL:", data.url);
        // Try multiple redirect strategies -- iframe sandboxing can block window.location
        try {
          // Strategy 1: top-level redirect (works if not deeply sandboxed)
          const target = window.top || window.parent || window;
          target.location.href = data.url;
        } catch {
          try {
            // Strategy 2: open in new tab/popup
            const popup = window.open(data.url, "_blank", "noopener,noreferrer");
            if (!popup) {
              // Strategy 3: direct location (fallback)
              window.location.href = data.url;
            }
          } catch {
            window.location.href = data.url;
          }
        }
        return;
      }
      console.warn("[GoogleAuth] No URL returned and no error");
      setError(t("login.errorGoogleNoUrl"));
      setLoading(false);
    } catch (err) {
      console.error("Google OAuth exception:", err);
      setError(t("login.errorGoogleFailed"));
      setLoading(false);
    }
  };

  const switchMode = (newMode: "signin" | "signup" | "reset") => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  const titles = {
    signin: { heading: t("login.signinHeading"), sub: t("login.signinSub") },
    signup: { heading: t("login.signupHeading"), sub: t("login.signupSub") },
    reset: { heading: t("login.resetHeading"), sub: t("login.resetSub") },
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <OraLogo size={40} animate={false} />
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 16px 48px rgba(0,0,0,0.08)' }}>
          <h1
            className="text-center mb-2"
            style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
          >
            {titles[mode].heading}
          </h1>
          <p className="text-center mb-5" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            {titles[mode].sub}
          </p>
          {mode === "signup" && (
            <div
              className="text-center mb-7 inline-flex items-center justify-center gap-2 py-1.5 px-3 rounded-full mx-auto w-fit"
              style={{ background: "rgba(255,92,57,0.08)", border: "1px solid rgba(255,92,57,0.18)" }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#FF5C39" }} />
              <span className="mono-label" style={{ color: "#FF5C39", fontSize: 10.5 }}>
                6 posts on the house · no card
              </span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="flex items-start gap-2.5 mb-5 p-3 rounded-lg"
              style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.1)" }}
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--destructive)" }} />
              <span style={{ fontSize: "13px", lineHeight: 1.45, color: "var(--destructive)" }}>
                {error}
              </span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div
              className="flex items-start gap-2.5 mb-5 p-3 rounded-lg"
              style={{ background: "rgba(17,17,17,0.06)", border: "1px solid rgba(17,17,17,0.1)" }}
            >
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#666666" }} />
              <span style={{ fontSize: "13px", lineHeight: 1.45, color: "#666666" }}>
                {success}
              </span>
            </div>
          )}

          {/* Google sign in (not shown for reset) */}
          {mode !== "reset" && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 border py-2.5 rounded-full text-foreground hover:bg-secondary transition-colors mb-5 cursor-pointer disabled:opacity-50"
                style={{ fontSize: '14px', fontWeight: 450, borderColor: 'var(--border)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#666666"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#888888"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#AAAAAA"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#666666"/>
                </svg>
                {t("login.continueWithGoogle")}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t("login.dividerOr")}</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
            </>
          )}

          {/* Form */}
          <form
            onSubmit={mode === "signup" ? handleSignUp : mode === "reset" ? handleResetPassword : handleSignIn}
            className="space-y-4"
          >
            {mode === "signup" && (
              <div>
                <label className="block text-foreground mb-1.5" style={{ fontSize: '13px', fontWeight: 450 }}>
                  {t("login.labelFullName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("login.placeholderFullName")}
                  className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/40"
                  style={{ fontSize: '14px' }}
                />
              </div>
            )}
            <div>
              <label className="block text-foreground mb-1.5" style={{ fontSize: '13px', fontWeight: 450 }}>
                {t("login.labelEmail")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.placeholderEmail")}
                required
                className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/40"
                style={{ fontSize: '14px' }}
              />
            </div>
            {mode !== "reset" && (
              <div>
                <label className="block text-foreground mb-1.5" style={{ fontSize: '13px', fontWeight: 450 }}>
                  {t("login.labelPassword")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                    required
                    minLength={6}
                    className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 pr-10 text-foreground placeholder:text-muted-foreground/40"
                    style={{ fontSize: '14px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full hover:shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
              style={{ fontSize: '14px', fontWeight: 500, color: 'var(--background)', background: 'var(--foreground)' }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {mode === "signup" ? t("login.btnCreating") : mode === "reset" ? t("login.btnSending") : t("login.btnSigningIn")}
                </>
              ) : (
                <>
                  {mode === "signup" ? t("login.btnCreateAccount") : mode === "reset" ? t("login.btnSendResetLink") : t("login.btnSignIn")}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {mode === "signin" && (
            <p className="text-center mt-4">
              <button
                onClick={() => switchMode("reset")}
                className="text-ora-signal hover:underline cursor-pointer"
                style={{ fontSize: '13px' }}
              >
                {t("login.forgotPassword")}
              </button>
            </p>
          )}

          {mode === "reset" && (
            <p className="text-center mt-4">
              <button
                onClick={() => switchMode("signin")}
                className="text-ora-signal hover:underline cursor-pointer"
                style={{ fontSize: '13px' }}
              >
                {t("login.backToSignIn")}
              </button>
            </p>
          )}
        </div>

        {/* Toggle signin/signup */}
        {mode !== "reset" && (
          <p className="text-center mt-6 text-muted-foreground" style={{ fontSize: '14px' }}>
            {mode === "signup" ? t("login.alreadyHaveAccount") : t("login.dontHaveAccount")}
            {" "}
            <button
              onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
              className="text-ora-signal hover:underline cursor-pointer"
              style={{ fontSize: '14px', fontWeight: 500 }}
            >
              {mode === "signup" ? t("login.switchSignIn") : t("login.switchStartFree")}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
