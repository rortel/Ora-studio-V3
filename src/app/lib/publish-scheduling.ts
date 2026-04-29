/**
 * publish-scheduling — AI-suggested posting times for a generated pack.
 *
 * Used by SurprisePage when the user clicks "Publish" on a result pack:
 * we pre-fill the Calendar with one event per asset, scheduled at the
 * platform's optimal time and spread one-per-day starting tomorrow.
 *
 * The "AI" part is deterministic and based on the standard social-media
 * timing research (peak engagement windows by platform). No LLM call —
 * the user can drag any event in the calendar to override.
 */

// Surprise Me uses these platform IDs (matches PLATFORM_OPTIONS in
// SurprisePage). Calendar/PublishModal use slightly different labels —
// we map both directions here so callers can pick whichever shape they
// already have.
const PACK_TO_CALENDAR_CHANNEL: Record<string, string> = {
  "instagram-feed": "Instagram",
  "instagram-story": "Instagram",
  "linkedin": "LinkedIn",
  "facebook": "Facebook",
  "tiktok": "TikTok",
  "twitter": "Twitter/X",
  "youtube": "YouTube",
};

// Optimal posting time per channel (24-hour local). Picked from the
// commonly cited Sprout/HubSpot/Later windows so the user gets a
// sensible default — not a one-size-fits-all 09:00.
const CHANNEL_OPTIMAL_HOUR: Record<string, number> = {
  Instagram: 18,  // 18:00 — evening scroll peak
  LinkedIn: 9,    // 09:00 — pre-meeting feed check
  Facebook: 13,   // 13:00 — lunch break
  TikTok: 19,     // 19:00 — prime-time discovery
  "Twitter/X": 12, // 12:00 — midday news cycle
  YouTube: 14,    // 14:00 — Saturday afternoon
};

// Channels where we should avoid weekends entirely (B2B platforms get
// near-zero engagement on Sat/Sun, so we push to the next weekday).
const WEEKDAY_ONLY_CHANNELS = new Set(["LinkedIn"]);

export interface PackAssetForSchedule {
  platform: string;     // e.g. "instagram-feed", "linkedin"
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  fileName?: string;
  label?: string;
  aspectRatio?: string;
}

export interface SuggestedSchedule {
  asset: PackAssetForSchedule;
  channel: string;          // Calendar/PublishModal label, e.g. "Instagram"
  scheduledAt: Date;        // Local time the user should post
  hour: number;             // 0-23
  minute: number;           // 0 or 30 (we offset same-day slots by 30 min)
}

function nextValidDate(base: Date, weekdayOnly: boolean): Date {
  const d = new Date(base);
  if (!weekdayOnly) return d;
  // 0 = Sunday, 6 = Saturday in JS local time
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Generate a Calendar pre-fill plan for a pack. Returns one entry per
 * asset (only assets with imageUrl or videoUrl). Days are allocated
 * one per asset starting tomorrow; same-day items (e.g. an Instagram
 * Feed and an Instagram Story produced for the same shoot) are
 * stacked at the optimal hour and the optimal hour + 30 min so they
 * don't collide on the calendar.
 */
export function suggestScheduleForPack(items: PackAssetForSchedule[]): SuggestedSchedule[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + 1); // start tomorrow
  start.setHours(0, 0, 0, 0);

  const out: SuggestedSchedule[] = [];
  // Track minute offset per (day, hour) so multiple posts at the same
  // hour don't all show 18:00 — the second goes to 18:30, third 19:00.
  const slotCounter = new Map<string, number>();

  items.forEach((asset, idx) => {
    if (!asset.imageUrl && !asset.videoUrl) return;
    const channel = PACK_TO_CALENDAR_CHANNEL[asset.platform] || "Instagram";
    const weekdayOnly = WEEKDAY_ONLY_CHANNELS.has(channel);

    const dayOffset = out.length; // one per day, regardless of source idx
    const baseDay = new Date(start);
    baseDay.setDate(baseDay.getDate() + dayOffset);
    const day = nextValidDate(baseDay, weekdayOnly);

    const hour = CHANNEL_OPTIMAL_HOUR[channel] ?? 9;
    const slotKey = `${day.toDateString()}-${hour}`;
    const stackIdx = slotCounter.get(slotKey) || 0;
    slotCounter.set(slotKey, stackIdx + 1);
    const minute = stackIdx === 0 ? 0 : 30;
    const finalHour = stackIdx >= 2 ? hour + 1 : hour; // 3rd post → next hour

    const scheduledAt = new Date(day);
    scheduledAt.setHours(finalHour, minute, 0, 0);

    out.push({
      asset,
      channel,
      scheduledAt,
      hour: finalHour,
      minute,
    });
  });

  return out;
}

/**
 * Convert a SuggestedSchedule into the payload shape POST /calendar
 * expects (matches CalendarPage's `eventData` shape).
 */
export function scheduleToCalendarEvent(s: SuggestedSchedule, opts: { campaignName?: string } = {}) {
  const { asset, channel, scheduledAt, hour, minute } = s;
  const titleBase = asset.label || opts.campaignName || asset.fileName || "Pack post";
  const title = opts.campaignName && asset.label
    ? `${opts.campaignName} — ${asset.label}`
    : titleBase;
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return {
    title,
    channel,
    channelIcon: channel,
    time,
    status: "draft" as const,
    score: 0,
    color: "#666666",
    day: scheduledAt.getDate(),
    month: scheduledAt.getMonth(),
    year: scheduledAt.getFullYear(),
    caption: asset.caption || "",
    hashtags: "",
    imageUrl: asset.imageUrl || "",
    videoUrl: asset.videoUrl || "",
    assetType: asset.videoUrl ? "video" : "image",
    campaignTheme: opts.campaignName || "",
  };
}
