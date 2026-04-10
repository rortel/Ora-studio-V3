import { Hero } from "../components/Hero";
import { LogoMarquee } from "../components/LogoMarquee";
import { ProductShowcase } from "../components/ProductShowcase";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { CTASection } from "../components/CTASection";

/**
 * Landing — Phase 1: Aggregator / Comparator only.
 * Studio + Brand Vault coming in Phase 2.
 */

export function LandingPage() {
  return (
    <>
      <Hero />
      <LogoMarquee />
      <ProductShowcase />
      <Pricing />
      <FAQ />
      <CTASection />
    </>
  );
}
