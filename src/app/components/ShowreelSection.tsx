import { motion } from "motion/react";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SHOWREEL — Mur de visuels IA en auto-scroll
   3 rangées horizontales à vitesses alternées.
   Le visiteur comprend en 3 secondes.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const rows = [
  {
    images: [
      { src: "https://images.unsplash.com/photo-1767089261452-1245afe371af?w=600&q=90", label: "Image · Flux Pro 2" },
      { src: "https://images.unsplash.com/photo-1662972580899-b64ac990c9e9?w=600&q=90", label: "Image · Photon 1" },
      { src: "https://images.unsplash.com/photo-1741745978060-9add161ba2c2?w=600&q=90", label: "Image · DALL-E 3" },
      { src: "https://images.unsplash.com/photo-1611930021698-a55ec4d5fe6e?w=600&q=90", label: "Image · Seedream V4" },
      { src: "https://images.unsplash.com/photo-1688377051459-aebb99b42bff?w=600&q=90", label: "Image · Luma AI" },
      { src: "https://images.unsplash.com/photo-1714273709936-e5363d76b88f?w=600&q=90", label: "Image · Midjourney" },
    ],
    dir: 1,
    duration: 40,
    h: 200,
  },
  {
    images: [
      { src: "https://images.unsplash.com/photo-1769122489832-465d4e408895?w=600&q=90", label: "Image · DALL-E 3" },
      { src: "https://images.unsplash.com/photo-1670177257750-9b47927f68eb?w=600&q=90", label: "Video · Sora 2" },
      { src: "https://images.unsplash.com/photo-1737920459846-2d0318700658?w=600&q=90", label: "Image · Flux Pro" },
      { src: "https://images.unsplash.com/photo-1666003400042-a9e68d6bff0f?w=600&q=90", label: "Image · Ideogram" },
      { src: "https://images.unsplash.com/photo-1713147906717-173b53ca4e56?w=600&q=90", label: "Video · Kling 2" },
      { src: "https://images.unsplash.com/photo-1744148621897-5fb0b6323543?w=600&q=90", label: "Image · Photon 1" },
    ],
    dir: -1,
    duration: 52,
    h: 240,
  },
  {
    images: [
      { src: "https://images.unsplash.com/photo-1749800843099-83d0ee3d809e?w=600&q=90", label: "Image · Leonardo AI" },
      { src: "https://images.unsplash.com/photo-1650464595868-fd12e3047d33?w=600&q=90", label: "Image · Flux Pro 2" },
      { src: "https://images.unsplash.com/photo-1676044162854-1550e3f6dcc2?w=600&q=90", label: "Video · Runway Gen-3" },
      { src: "https://images.unsplash.com/photo-1670177257750-9b47927f68eb?w=600&q=90", label: "Image · Seedream V4" },
      { src: "https://images.unsplash.com/photo-1767089261452-1245afe371af?w=600&q=90", label: "Image · Photon 1" },
      { src: "https://images.unsplash.com/photo-1662972580899-b64ac990c9e9?w=600&q=90", label: "Image · DALL-E 3" },
    ],
    dir: 1,
    duration: 46,
    h: 200,
  },
];

function ShowreelRow({
  images,
  dir,
  duration,
  h,
}: {
  images: { src: string; label: string }[];
  dir: number;
  duration: number;
  h: number;
}) {
  const doubled = [...images, ...images];
  const gap = 12;
  const itemW = Math.round(h * 1.4);
  const singleW = images.length * (itemW + gap);

  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex"
        style={{ gap }}
        animate={{ x: dir === 1 ? [0, -singleW] : [-singleW, 0] }}
        transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
      >
        {doubled.map((img, i) => (
          <div
            key={i}
            className="relative flex-shrink-0 rounded-2xl overflow-hidden group"
            style={{ width: itemW, height: h }}
          >
            <img
              src={img.src}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            {/* Label on hover */}
            <div
              className="absolute bottom-0 left-0 right-0 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
              }}
            >
              <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.80)", letterSpacing: "0.04em" }}>
                {img.label}
              </span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function ShowreelSection() {
  return (
    <section
      style={{ background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.05)" }}
      className="py-16 md:py-24 overflow-hidden"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="text-center px-6 mb-10 md:mb-14"
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            marginBottom: 12,
          }}
        >
          Made with ORA
        </p>
        <h2
          style={{
            fontSize: "clamp(1.8rem, 4vw, 3rem)",
            fontWeight: 300,
            lineHeight: 1.1,
            letterSpacing: "-0.045em",
            color: "#F0EDE8",
          }}
        >
          What our users create.
        </h2>
      </motion.div>

      {/* Rows */}
      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <ShowreelRow
            key={i}
            images={row.images}
            dir={row.dir}
            duration={row.duration}
            h={row.h}
          />
        ))}
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32" style={{ background: "linear-gradient(to right, #0A0A0A 0%, transparent 100%)" }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32" style={{ background: "linear-gradient(to left, #0A0A0A 0%, transparent 100%)" }} />
    </section>
  );
}
