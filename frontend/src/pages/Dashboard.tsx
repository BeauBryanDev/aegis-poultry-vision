import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { COLORS } from "@/theme";
import { ACTIVITY_LABEL } from "@/theme";
import { useUiStore } from "@/store/uiStore";
import type { PerformanceMetrics, PoultryReport as PoultryReportData, Zone } from "@/types/model.types";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { DownloadIcon } from "@/components/ui/Icon";
import { PoultryReport } from "@/components/dashboard/PoultryReport";
import { ZoneCard } from "@/components/dashboard/ZoneCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StreamPanel } from "@/components/live_monitor/StreamPanel";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { RadarChart } from "@/components/charts/RadarChart";
import { ChartIcon } from "@/components/ui/Icon";

export default function Dashboard() {
  const [report, setReport] = useState<PoultryReportData | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [perf, setPerf] = useState<PerformanceMetrics | null>(null);
  const { timeRange, setTimeRange } = useUiStore();

  useEffect(() => {
    api.getPoultryReport().then(setReport);
    api.getZones().then(setZones);
    api.getPerformance().then(setPerf);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      {/* Left column */}
      <div className="flex flex-col gap-4">
        {report && <PoultryReport data={report} />}
        <Card title="Zone Distribution">
          <div className="grid grid-cols-2 gap-3">
            {zones.map((z) => (
              <ZoneCard key={z.id} zone={z} />
            ))}
          </div>
        </Card>
        <Button className="w-full">
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
        <Card
          title="Performance Metrics"
          icon={<ChartIcon size={16} />}
          action={
            <Dropdown
              value={timeRange}
              onChange={(v) => setTimeRange(v as typeof timeRange)}
              options={[
                { value: "today", label: "Today" },
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" },
              ]}
            />
          }
        >
          {perf && (
            <>
              <div className="hud-label mb-1 text-[10px]">Activity Distribution (%)</div>
              <BarChart
                data={perf.activityDistribution.map((a) => ({
                  label: ACTIVITY_LABEL[a.state],
                  value: a.percent,
                }))}
              />
            </>
          )}
        </Card>

        {perf && (
          <Card title="Bird Count Over Time">
            <LineChart data={perf.birdCountOverTime} />
          </Card>
        )}

        {perf && (
          <Card title="Activity Radar">
            <RadarChart data={perf.activityRadar} />
          </Card>
        )}

        {perf && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard
              title="Anomaly Alerts"
              value={perf.anomalyAlerts.today}
              unit="Today"
              valueColor={COLORS.anomaly}
              chart={<LineChart data={perf.anomalyAlerts.trend} color={COLORS.anomaly} height={48} showAxes={false} />}
            />
            <MetricCard
              title="Health Index"
              value={perf.healthIndex.value}
              unit="/100"
              valueColor={COLORS.health}
              chart={<LineChart data={perf.healthIndex.trend} color={COLORS.health} height={48} showAxes={false} />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
