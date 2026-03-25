import { Hero } from "../components/Hero";
import { ShowreelSection } from "../components/ShowreelSection";
import { SocialProof } from "../components/SocialProof";
import { ThreeSteps } from "../components/ThreeSteps";
import { StudioExperience } from "../components/StudioExperience";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { CTASection } from "../components/CTASection";

/**
 * Landing — Warm cream/amber design system
 * Hero → SocialProof → ThreeSteps → StudioExperience → Pricing → FAQ → CTA
 */

export function LandingPage() {
  return (
    <div style={{ background: "#0A0A0A" }}>
      <Hero />
      <ShowreelSection />
      <SocialProof />
      <ThreeSteps />
      <StudioExperience />
      <Pricing />
      <FAQ />
      <CTASection />
    </div>
  );
}
