import { useMemo } from "react";
import { ACTIVITY_COLOR, ACTIVITY_LABEL, COLORS } from "@/theme";
import { useVideoStore } from "@/store/videoStore";
import { activityBreakdown, zoneCounts } from "@/utils/chickens";
import { formatVideoTime } from "@/utils/format";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChartIcon, DownloadIcon } from "@/components/ui/Icon";
import { PoultryReport } from "@/components/dashboard/PoultryReport";
import { ZoneCard } from "@/components/dashboard/ZoneCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StreamPanel } from "@/components/live_monitor/StreamPanel";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";

export default function Dashboard() {
  const { stats, history, phase, fileName } = useVideoStore();

  const breakdown = useMemo(() => activityBreakdown(stats), [stats]);
  const zones = useMemo(() => zoneCounts(stats), [stats]);

  const series = useMemo(() => {
    const at = (pick: (p: (typeof history)[number]) => number) =>
      history.map((p) => ({ t: formatVideoTime(p.time), value: pick(p) }));

    return {
      count: at((p) => p.live),
      events: at((p) => p.events),
      speed: at((p) => p.speed),
    };
  }, [history]);

  const lastSpeed = history.length ? history[history.length - 1].speed : 0;

  /** Saves the run summary (everything except the per-frame track list). */
  const downloadReport = () => {
    if (!stats) return;
    const { tracks: _tracks, ...summary } = stats;
    const report = { file: fileName, ...summary, history };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `poultry-report-${stats.video_id.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      {/* Left column */}
      <div className="flex flex-col gap-4">
        <PoultryReport
          liveCount={stats?.live_count ?? 0}
          peakCount={stats?.peak_count ?? 0}
          totalUnique={stats?.total_unique ?? 0}
          countTrend={series.count}
          breakdown={breakdown}
          live={phase === "processing"}
        />
        <Card title="Zone Distribution (frame quadrants)">
          <div className="grid grid-cols-2 gap-3">
            {zones.map((z) => (
              <ZoneCard key={z.id} zone={z} />
            ))}
          </div>
        </Card>
        <Button className="w-full" disabled={!stats || stats.frame_index === 0} onClick={downloadReport}>
          <DownloadIcon size={18} />
          Download Report
        </Button>
      </div>

      {/* Center column */}
      <div className="min-w-0">
        <StreamPanel />
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        <Card title="Activity Distribution (%)" icon={<ChartIcon size={16} />}>
          <BarChart
            data={breakdown.map((a) => ({
              label: ACTIVITY_LABEL[a.state],
              value: Math.round(a.percent * 10) / 10,
              color: ACTIVITY_COLOR[a.state],
            }))}
          />
        </Card>

        <Card title="Bird Count Over Time">
          <LineChart data={series.count} />
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <MetricCard
            title="Anomaly Events"
            value={stats?.anomaly.total_events ?? 0}
            unit={stats?.anomaly.active ? `${stats.anomaly.active} bird(s) flagged now` : "this video"}
            valueColor={COLORS.anomaly}
            chart={<LineChart data={series.events} color={COLORS.anomaly} height={48} showAxes={false} />}
          />
          <MetricCard
            title="Mean Flock Speed"
            value={lastSpeed.toFixed(2)}
            unit="body lengths / s"
            valueColor={COLORS.secondary}
            chart={<LineChart data={series.speed} color={COLORS.secondary} height={48} showAxes={false} />}
          />
        </div>
      </div>
    </div>
  );
}
