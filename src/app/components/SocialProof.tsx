const models = [
  "GPT-4o", "GPT-4.1", "Claude Sonnet", "Claude Haiku", "Gemini 2.5 Flash",
  "Luma Photon", "Photon Flash", "Flux Pro", "Flux Schnell", "DALL-E 3",
  "Seedream", "Recraft V3", "Kling 2.1", "Veo 3", "Sora 2", "Runway Gen-3",
];

export function SocialProof() {
  const doubled = [...models, ...models];

  return (
    <section
      className="py-5 overflow-hidden"
      style={{ background: "#FAFAFA" }}
    >
      <div className="relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-24 z-10"
          style={{ background: "linear-gradient(90deg, #FAFAFA, transparent)" }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-24 z-10"
          style={{ background: "linear-gradient(270deg, #FAFAFA, transparent)" }}
        />
        <div
          className="flex items-center gap-10 whitespace-nowrap"
          style={{ animation: "ora-marquee 50s linear infinite" }}
        >
          {doubled.map((name, i) => (
            <span
              key={`${name}-${i}`}
              style={{
                fontSize: "12px",
                fontWeight: 400,
                fontFamily: "'Inter', sans-serif",
                color: "#BBBBBB",
                letterSpacing: "-0.01em",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
