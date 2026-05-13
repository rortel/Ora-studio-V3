# Landing showcase — phase 3 of the hero demo

The 6 image slots in the landing's animated hero (CleanHero → phase 3)
read from this folder. Drop your 6 best real Ora outputs here and they
appear live on the landing.

## File names (required)

```
01.jpg  → Lifestyle slot
02.jpg  → Packshot slot
03.jpg  → Story slot
04.jpg  → Carousel slot
05.jpg  → Promo slot (over coral fallback)
06.jpg  → Reel slot (over dark fallback)
```

## Requirements

- **Format**: JPG preferred (lighter than PNG, transparent bg not needed
  on this surface). PNG works if you rename to `.png` in the slot map.
- **Aspect ratio**: 4:5 (portrait). Grid is 3 columns × 2 rows so a
  4:5 ratio fills each slot without crop. 1:1 also fits but the bottom
  20% gets cropped.
- **Resolution**: 800–1200px on the long edge is enough — the slots
  render at ~280px wide on a 1240px viewport. Anything bigger is wasted
  bytes.
- **Weight**: aim for < 150 KB each (≈ 80–85% JPEG quality). Total
  landing payload stays light.
- **Content**: any Ora output you have full rights on. Suggested mix:
  - 01 Lifestyle — wearer-in-scene shot
  - 02 Packshot — clean product on neutral bg
  - 03 Story — vertical 9:16 (cropped to 4:5 here, fine)
  - 04 Carousel — magazine-style spread
  - 05 Promo — punchy CTA scene
  - 06 Reel — moody / dark-bg shot

## Fallback when files are missing

If a file is missing, the slot's `<img>` hides itself on `onError` and
the parent div's designed gradient fallback shows through — the
platform tag stays readable on top. So the landing never breaks even
without these files; it just shows a clean colored-frame state.

## Rights reminder

These images go on the public landing. Make sure you own the product
photography (or have explicit permission) — Ora's outputs are derivative
of the input, so a client-owned product photo flowed through Ora still
carries that client's rights. Recommended: use a generic / fictional
product you own, an open-license stock photo, or a fully synthetic AI
product as the source, then ship its 6 Ora outputs here.
