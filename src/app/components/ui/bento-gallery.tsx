"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "./utils";

/**
 * One gallery cell. `url` is either an image or a video (.mp4 / .webm);
 * we auto-detect and render the right element. `span` is an arbitrary
 * Tailwind span override for the bento layout (e.g. `md:col-span-2
 * md:row-span-2` for a 2×2 tile). Anything that can't be proved to be a
 * video falls back to <img>.
 */
export type BentoItem = {
  id: number | string;
  title: string;
  desc: string;
  url: string;
  /** Optional poster frame when `url` is a video. */
  posterUrl?: string;
  /** Optional short badge rendered top-left (platform, duration, etc.). */
  badge?: string;
  /** Tailwind span classes for the bento layout. */
  span?: string;
};

interface BentoGalleryProps {
  items: BentoItem[];
  title: string;
  description: string;
  /** Optional eyebrow — small coral line above the title. */
  eyebrow?: string;
  /** Section id so anchor links keep working. */
  id?: string;
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function Media({
  item,
  className,
}: {
  item: BentoItem;
  className?: string;
}) {
  const video = isVideoUrl(item.url);
  if (video) {
    return (
      <video
        src={item.url}
        poster={item.posterUrl}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }
  return (
    <img
      src={item.url}
      alt={item.title}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

/**
 * Full-screen lightbox — click anywhere outside (or the X) to close.
 * ESC is wired at the parent so it closes even when this unmounts clean.
 */
function LightboxModal({
  item,
  onClose,
}: {
  item: BentoItem;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Media
          item={item}
          className="h-auto max-h-[85vh] w-full rounded-2xl object-contain"
        />
        <div className="mt-4 text-center text-white/90">
          <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
          {item.desc && (
            <p className="mt-1 text-sm text-white/60">{item.desc}</p>
          )}
        </div>
      </motion.div>
      <button
        onClick={onClose}
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/90 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
        aria-label="Close preview"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
}

/**
 * Horizontal-scroll bento gallery with drag-to-pan and a lightbox modal.
 * The outer row uses `grid-auto-flow: column` so each item's `span` class
 * (col-span-*, row-span-*) maps into the bento mosaic effect.
 */
export function BentoGallery({
  items,
  title,
  description,
  eyebrow,
  id,
  className,
}: BentoGalleryProps) {
  const [selected, setSelected] = useState<BentoItem | null>(null);
  const [dragConstraint, setDragConstraint] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  // Drag bounds — pan left until the tail of the grid is visible.
  useEffect(() => {
    const recalc = () => {
      if (gridRef.current && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const gridWidth = gridRef.current.scrollWidth;
        setDragConstraint(Math.min(0, containerWidth - gridWidth - 32));
      }
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [items]);

  // ESC closes the lightbox regardless of focus state.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Scroll-tied fade-in for the header block.
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.85, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2], [30, 0]);

  return (
    <section
      ref={targetRef}
      id={id}
      className={cn(
        "relative w-full overflow-hidden py-16 sm:py-24",
        className,
      )}
    >
      <motion.div
        style={{ opacity, y }}
        className="container mx-auto px-4 text-center"
      >
        {eyebrow && (
          <div
            className="mb-3 text-[11px] font-mono uppercase tracking-[0.22em]"
            style={{ color: "var(--accent, #FF5C39)" }}
          >
            {eyebrow}
          </div>
        )}
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {description}
        </p>
      </motion.div>

      <div
        ref={containerRef}
        className="relative mt-12 w-full cursor-grab active:cursor-grabbing"
      >
        <motion.div
          className="w-max"
          drag="x"
          dragConstraints={{ left: dragConstraint, right: 0 }}
          dragElastic={0.05}
        >
          <motion.div
            ref={gridRef}
            className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-4 px-4 md:px-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {items.map((item) => (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className={cn(
                  "group relative flex h-full min-h-[15rem] w-full min-w-[15rem] cursor-pointer items-end overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-shadow duration-300 ease-in-out hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  item.span,
                )}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => setSelected(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(item);
                  }
                }}
                tabIndex={0}
                aria-label={`Open ${item.title}`}
              >
                <Media
                  item={item}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {item.badge && (
                  <div className="absolute left-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                    {item.badge}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative z-10 translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  {item.desc && (
                    <p className="mt-1 text-sm text-white/80">{item.desc}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && (
          <LightboxModal item={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

export default BentoGallery;
