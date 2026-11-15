import { useAppStore } from "@/store/appStore";
import { useVideoStore } from "@/store/videoStore";
import { ClockIcon } from "@/components/ui/Icon";
import { formatPercent } from "@/utils/format";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color =
    tone === "green" ? "font-semibold text-status-active" : tone === "red" ? "font-semibold text-status-anomaly" : "text-text";
  return (
    <div className="flex flex-col">
      <span className="hud-label text-[10px]">{label}</span>
      <span className={`text-sm ${color}`}>{value}</span>
    </div>
  );
}

const PHASE_LABEL = {
  idle: "No video",
  uploading: "Uploading",
  processing: "Analyzing",
  done: "Finished",
  cancelled: "Stopped",
  error: "Error",
} as const;

/** Footer status strip: backend, current video, processing speed. */
export function Footer() {
  const backend = useAppStore((s) => s.backend);
  const { phase, stats } = useVideoStore();

  return (
    <footer className="neon-footer mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 bg-surface/60 px-4 py-3">
      <div className="flex items-center gap-2 text-primary">
        <ClockIcon size={18} />
      </div>
      <Stat
        label="Backend"
        value={backend === "online" ? "Connected" : backend === "checking" ? "Checking…" : "Not reachable"}
        tone={backend === "online" ? "green" : backend === "checking" ? undefined : "red"}
      />
      <Stat label="Analysis" value={PHASE_LABEL[phase]} tone={phase === "error" ? "red" : undefined} />
      <Stat label="Progress" value={stats ? formatPercent(stats.progress * 100, 0) : "—"} />
      <Stat label="Processing Speed" value={stats ? `${stats.processing_fps.toFixed(1)} fps` : "—"} />
      <Stat label="Video" value={stats ? `${stats.width}×${stats.height} @ ${stats.fps} fps` : "—"} />
      <span className="ml-auto text-xs text-text-dim">© 2026 PoultryVision</span>
    </footer>
  );
}
