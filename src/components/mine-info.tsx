import type { Mine } from "@/lib/data";

interface MineInfoProps {
  mine: Mine;
}

export function MineInfo({ mine }: MineInfoProps) {
  return (
    <div className="grid md:grid-cols-2 gap-12">
      {/* History */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl text-foreground">History</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          {mine.history.split("\n\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Geology */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl text-foreground">Geology</h2>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          {mine.geology.split("\n\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
