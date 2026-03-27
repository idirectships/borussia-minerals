"use client";

import { Shield, Truck, RotateCcw, Award } from "lucide-react";

interface TrustSignalsProps {
  isFromOwnMine?: boolean;
}

export function TrustSignals({ isFromOwnMine }: TrustSignalsProps) {
  const signals = [
    { icon: Truck, text: "Insured shipping worldwide" },
    { icon: Shield, text: "Certificate of authenticity" },
    ...(isFromOwnMine
      ? [{ icon: Award, text: "Direct from our own mine" }]
      : []),
    { icon: RotateCcw, text: "14-day return policy" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {signals.map(({ icon: Icon, text }) => (
        <div
          key={text}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Icon className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}
