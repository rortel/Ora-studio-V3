import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

export interface CopyVariant {
  headline?: string;
  caption?: string;
  hashtags?: string;
  ctaText?: string;
  subject?: string;
  features?: string[];
  imagePrompt?: string;
  videoPrompt?: string;
}

interface CopyVariantPickerProps {
  variants: {
    variant_1: CopyVariant;
    variant_2: CopyVariant;
    variant_3: CopyVariant;
  };
  activeVariant: string;
  onSelect: (variantKey: string, variant: CopyVariant) => void;
}

const VARIANT_LABELS: Record<string, { label: string; angle: string }> = {
  variant_1: { label: "A", angle: "Direct" },
  variant_2: { label: "B", angle: "Story" },
  variant_3: { label: "C", angle: "Bold" },
};

export function CopyVariantPicker({ variants, activeVariant, onSelect }: CopyVariantPickerProps) {
  if (!variants?.variant_1) return null;

  return (
    <Tabs
      value={activeVariant}
      onValueChange={(key) => {
        const v = variants[key as keyof typeof variants];
        if (v) onSelect(key, v);
      }}
      className="mt-2"
    >
      <TabsList className="h-7 gap-0.5">
        {Object.entries(VARIANT_LABELS).map(([key, { label, angle }]) => {
          const v = variants[key as keyof typeof variants];
          if (!v) return null;
          return (
            <TabsTrigger key={key} value={key} className="text-xs px-2 py-0.5 h-6" title={`${angle} angle`}>
              {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {Object.entries(VARIANT_LABELS).map(([key, { angle }]) => {
        const v = variants[key as keyof typeof variants];
        if (!v) return null;
        return (
          <TabsContent key={key} value={key} className="mt-1.5">
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground font-medium">{angle} angle</p>
              {v.headline && (
                <p className="font-semibold text-foreground line-clamp-2">{v.headline}</p>
              )}
              {v.caption && (
                <p className="text-muted-foreground line-clamp-3">{v.caption}</p>
              )}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
