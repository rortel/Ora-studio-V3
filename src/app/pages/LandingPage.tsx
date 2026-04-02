import { Hero } from "../components/Hero";
import { LogoMarquee } from "../components/LogoMarquee";
import { ProductShowcase } from "../components/ProductShowcase";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { CTASection } from "../components/CTASection";

/**
 * Landing — Visual-first structure:
 * 1. Hero (video + headline)
 * 2. Logo Marquee (AI model logos, infinite scroll)
 * 3. Product Showcase (3 full-bleed sections: Studio, Vault, Calendar)
 * 4. Pricing + FAQ + CTA
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
