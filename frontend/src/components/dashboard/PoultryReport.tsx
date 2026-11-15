import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "@/components/charts/Sparkline";
import { StatusRow } from "./StatusRow";
import { formatNumber } from "@/utils/format";
import { GridIcon } from "@/components/ui/Icon";
import type { TimeSeriesPoint } from "@/types/common.types";
import type { ActivityBreakdown } from "@/types/model.types";

interface PoultryReportProps {
  liveCount: number;
  peakCount: number;
  totalUnique: number;
  countTrend: TimeSeriesPoint[];
  breakdown: ActivityBreakdown[];
  /** True while a video is being analyzed. */
  live: boolean;
}

/** Left-column headline panel: live count, count trend, activity breakdown. */
export function PoultryReport({ liveCount, peakCount, totalUnique, countTrend, breakdown, live }: PoultryReportProps) {
  return (
    <Card title="Poultry Report" icon={<GridIcon size={16} />}>
      <div className="flex items-start justify-between">
        <div>
          <div className="hud-label text-[10px]">Birds in frame (tracked)</div>
          <div className="flex items-baseline gap-2">
            <span className="hud-metric text-4xl text-primary">{formatNumber(liveCount)}</span>
            <span className="text-xs text-text-muted">birds</span>
          </div>
        </div>
        <Badge tone={live ? "danger" : "neutral"} dot>
          {live ? "Live" : "Idle"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="hud-label text-[10px]">Peak in frame</div>
          <span className="hud-metric text-lg">{formatNumber(peakCount)}</span>
        </div>
        <div title="Each track ID counted once. Runs high when birds are hidden and re-appear, or when the camera moves.">
          <div className="hud-label text-[10px]">Unique tracks</div>
          <span className="hud-metric text-lg">{formatNumber(totalUnique)}</span>
        </div>
      </div>

      <div className="mt-2">
        <Sparkline data={countTrend} />
      </div>

      <div className="mt-3 divide-y divide-border border-t border-border">
        {breakdown.map((b) => (
          <StatusRow key={b.state} item={b} />
        ))}
      </div>
    </Card>
  );
}
