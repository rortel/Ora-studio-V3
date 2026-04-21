import { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth, type Feature, requiredPlan } from "../lib/auth-context";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { PulseIcon } from "./PulseMotif";
import { bagel, COLORS } from "./ora/tokens";
import { Button } from "./ora/Button";
import { Badge } from "./ora/Badge";

/** Internal plan code → public-facing tier name shown in CTAs / upgrade
 *  screens. The server and the code use creator/studio/agency as
 *  aliases for starter/pro/business; we always surface the public
 *  names to the user. */
const PUBLIC_PLAN_NAME: Record<string, string> = {
  free: "Free",
  starter: "Creator",
  pro: "Studio",
  business: "Agency",
};

interface RouteGuardProps {
  children: React.ReactNode;
  /** If set, user must be logged in */
  requireAuth?: boolean;
  /** If set, user must have access to this feature */
  requireFeature?: Feature;
  /** If set, user must be admin */
  requireAdmin?: boolean;
}

export function RouteGuard({ children, requireAuth: needsAuth = true, requireFeature, requireAdmin }: RouteGuardProps) {
  const { user, isLoading, isAdmin, can, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && needsAuth && !user) {
      navigate("/login");
    }
  }, [isLoading, needsAuth, user, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in
  if (needsAuth && !user) {
    return null; // useEffect will redirect
  }

  // Profile still loading (user exists but profile not yet fetched)
  if (needsAuth && user && !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Admin check
  if (requireAdmin && !isAdmin) {
    return <AccessDenied reason="admin" />;
  }

  // Feature check
  if (requireFeature && !can(requireFeature)) {
    const minPlan = requiredPlan(requireFeature);
    return <UpgradeRequired feature={requireFeature} minPlan={minPlan} />;
  }

  return <>{children}</>;
}

function AccessDenied({ reason }: { reason: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <Lock size={20} style={{ color: "var(--destructive)" }} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--foreground)", marginBottom: "8px" }}>
          Access restricted
        </h2>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: "20px" }}>
          {reason === "admin" 
            ? "This page is restricted to administrators."
            : "You don't have permission to access this page."}
        </p>
        <Link
          to="/hub"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
          style={{ fontSize: "14px", fontWeight: 500 }}
        >
          Back to Hub
        </Link>
      </div>
    </div>
  );
}

function UpgradeRequired({ feature, minPlan }: { feature: Feature; minPlan: string }) {
  const featureLabels: Record<Feature, string> = {
    hub: "AI Hub",
    vault: "Brand Vault",
    analytics: "Analytics",
    campaignLab: "Campaign Lab",
  };
  const publicPlan = PUBLIC_PLAN_NAME[minPlan] || minPlan;
  const featureLabel = featureLabels[feature] || feature;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6" style={{ background: COLORS.cream }}>
      <div className="text-center max-w-[540px]">
        <div className="inline-flex mb-6">
          <Badge tone="butter">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.ink }} />
            {publicPlan} only
          </Badge>
        </div>
        <h2 className="leading-[0.95] mb-4" style={{ ...bagel, fontSize: "clamp(40px, 6vw, 72px)" }}>
          {featureLabel} lives on <span style={{ color: COLORS.coral }}>{publicPlan}.</span>
        </h2>
        <p className="text-[16px] leading-relaxed mb-8" style={{ color: COLORS.muted }}>
          {feature === "vault"
            ? "Drop your URL once. We pin your palette, tone and photo style on every shot — the DA stays locked across the pack."
            : `Unlock ${featureLabel.toLowerCase()} and keep going without prompts.`}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link to="/pricing">
            <Button variant="accent" size="lg">
              See plans <ArrowRight size={16} />
            </Button>
          </Link>
          <Link to="/hub/surprise">
            <Button variant="ghost" size="lg">
              Back to Surprise Me
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}