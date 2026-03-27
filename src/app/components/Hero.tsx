import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import heroVideo from "../../assets/hero-video.mp4";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HERO — Full-screen video background
   Text overlay, cinematic feel.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ marginTop: "-64px", height: "100vh", minHeight: 600 }}
    >
      {/* ━━━ Video background ━━━ */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
        src={heroVideo}
      />

      {/* Dark overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ━━━ Text overlay ━━━ */}
      <div
        className="relative flex flex-col items-center justify-center text-center px-6 h-full"
        style={{ zIndex: 2 }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
              fontSize: "12px",
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "0.02em",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#FFFFFF", display: "inline-block",
            }} />
            Now with video generation
          </span>
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden mb-6">
          <motion.h1
            initial={{ y: "110%", opacity: 0 }}
            animate={loaded ? { y: "0%", opacity: 1 } : {}}
            transition={{ duration: 1.1, delay: 0.2, ease: EASE as unknown as number[] }}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "clamp(3.5rem, 9vw, 8rem)",
              fontWeight: 300,
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              color: "#FFFFFF",
            }}
          >
            One studio,
            <br />
            every AI
          </motion.h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "clamp(15px, 1.6vw, 18px)",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.65)",
            fontWeight: 400,
            maxWidth: 440,
            marginBottom: "2rem",
            letterSpacing: "-0.01em",
          }}
        >
          All the best AI models in one place.
          <br className="hidden sm:block" />
          Generate images, videos, copy — publish everywhere.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="flex items-center gap-3"
        >
          <Link
            to="/login?mode=signup"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
            style={{
              background: "#FFFFFF",
              color: "#111111",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            Start creating
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-1.5 px-5 py-3.5 rounded-full transition-all duration-200"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.65)",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            How it works
          </a>
        </motion.div>
      </div>
    </section>
  );
}
