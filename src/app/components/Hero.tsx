import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

const columns = [
  {
    images: [
      "https://images.unsplash.com/photo-1767089261452-1245afe371af?w=500&q=85",
      "https://images.unsplash.com/photo-1662972580899-b64ac990c9e9?w=500&q=85",
      "https://images.unsplash.com/photo-1688377051459-aebb99b42bff?w=500&q=85",
      "https://images.unsplash.com/photo-1714273709936-e5363d76b88f?w=500&q=85",
      "https://images.unsplash.com/photo-1611930021698-a55ec4d5fe6e?w=500&q=85",
    ],
    dir: 1 as const,
    duration: 38,
  },
  {
    images: [
      "https://images.unsplash.com/photo-1737920459846-2d0318700658?w=500&q=85",
      "https://images.unsplash.com/photo-1670177257750-9b47927f68eb?w=500&q=85",
      "https://images.unsplash.com/photo-1744148621897-5fb0b6323543?w=500&q=85",
      "https://images.unsplash.com/photo-1749800843099-83d0ee3d809e?w=500&q=85",
      "https://images.unsplash.com/photo-1676044162854-1550e3f6dcc2?w=500&q=85",
    ],
    dir: -1 as const,
    duration: 30,
  },
  {
    images: [
      "https://images.unsplash.com/photo-1650464595868-fd12e3047d33?w=500&q=85",
      "https://images.unsplash.com/photo-1666003400042-a9e68d6bff0f?w=500&q=85",
      "https://images.unsplash.com/photo-1769122489832-465d4e408895?w=500&q=85",
      "https://images.unsplash.com/photo-1713147906717-173b53ca4e56?w=500&q=85",
      "https://images.unsplash.com/photo-1741745978060-9add161ba2c2?w=500&q=85",
    ],
    dir: 1 as const,
    duration: 44,
  },
  {
    images: [
      "https://images.unsplash.com/photo-1744148621897-5fb0b6323543?w=500&q=85",
      "https://images.unsplash.com/photo-1737920459846-2d0318700658?w=500&q=85",
      "https://images.unsplash.com/photo-1767089261452-1245afe371af?w=500&q=85",
      "https://images.unsplash.com/photo-1670177257750-9b47927f68eb?w=500&q=85",
      "https://images.unsplash.com/photo-1688377051459-aebb99b42bff?w=500&q=85",
    ],
    dir: -1 as const,
    duration: 34,
  },
];

const IMG_H = 260;
const GAP = 10;

function ScrollColumn({
  images,
  dir,
  duration,
}: {
  images: string[];
  dir: 1 | -1;
  duration: number;
}) {
  const doubled = [...images, ...images];
  const singleH = images.length * (IMG_H + GAP);

  return (
    <div className="overflow-hidden flex-1 relative">
      <motion.div
        className="flex flex-col"
        style={{ gap: GAP }}
        animate={{
          y: dir === 1 ? [0, -singleH] : [-singleH, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
      >
        {doubled.map((src, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden flex-shrink-0"
            style={{ height: IMG_H }}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              loading={i < 5 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        height: "100svh",
        minHeight: 640,
        background: "#0E0C0A",
        marginTop: "-56px",
      }}
    >
      {/* Scrolling image wall — 2 cols on mobile, 4 on desktop */}
      <div
        className="absolute inset-0 flex gap-2.5"
        style={{ padding: "10px", paddingTop: "66px" }}
      >
        {columns.map((col, i) => (
          <div key={i} className={i >= 2 ? "hidden md:flex flex-1" : "flex flex-1"}>
            <ScrollColumn
              images={col.images}
              dir={col.dir}
              duration={col.duration}
            />
          </div>
        ))}
      </div>

      {/* Dark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 80% at 50% 50%, rgba(14,12,10,0.85) 0%, rgba(14,12,10,0.60) 60%, rgba(14,12,10,0.25) 100%)",
        }}
      />

      {/* Top/bottom fades */}
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to bottom, #0E0C0A 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to top, #0A0A0A 0%, transparent 100%)",
        }}
      />

      {/* Central content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-6 text-center pointer-events-none">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.70)",
            }}
          >
            38+ models · Image · Video · Text · Audio
          </span>
        </motion.div>

        {/* Main headline */}
        <div className="overflow-hidden mb-1">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ delay: 0.5, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(3rem, 9vw, 7.5rem)",
              fontWeight: 300,
              lineHeight: 1.0,
              letterSpacing: "-0.055em",
              color: "#F5F0E8",
            }}
          >
            Every AI model.
          </motion.h1>
        </div>

        <div className="overflow-hidden mb-10">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ delay: 0.65, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(3rem, 9vw, 7.5rem)",
              fontWeight: 300,
              lineHeight: 1.0,
              letterSpacing: "-0.055em",
              color: "#FFFFFF",
            }}
          >
            One studio.
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          style={{
            fontSize: "clamp(15px, 1.8vw, 18px)",
            lineHeight: 1.65,
            color: "rgba(245,240,232,0.55)",
            maxWidth: 480,
            marginBottom: 44,
            fontWeight: 400,
          }}
        >
          Generate images, videos, text and audio with 38+ AI models.
          Compare, choose, publish — all in one place.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="flex items-center gap-3 flex-wrap justify-center pointer-events-auto"
        >
          <Link
            to="/login?mode=signup"
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{
              background: "#FFFFFF",
              color: "#0A0A0A",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              boxShadow: "0 4px 24px rgba(255,255,255,0.15)",
            }}
          >
            Start for free
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform duration-300"
            />
          </Link>

          <a
            href="#studio"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl transition-all hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(245,240,232,0.80)",
              fontSize: "15px",
              fontWeight: 500,
              backdropFilter: "blur(12px)",
            }}
          >
            See the studio
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
          style={{
            fontSize: "12px",
            color: "rgba(245,240,232,0.28)",
            marginTop: 24,
            letterSpacing: "0.02em",
          }}
        >
          50 free credits · No credit card required
        </motion.p>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 mx-auto"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(245,240,232,0.25), transparent)",
          }}
        />
      </motion.div>
    </section>
  );
}
