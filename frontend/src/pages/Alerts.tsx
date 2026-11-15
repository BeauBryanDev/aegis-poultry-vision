import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertIcon } from "@/components/ui/Icon";
import { useVideoStore } from "@/store/videoStore";
import { formatVideoTime } from "@/utils/format";

/** Anomaly events of the current video: birds that suddenly sped up. */
export default function Alerts() {
  const { stats, fileName } = useVideoStore();
  const events = stats ? [...stats.anomaly.events].reverse() : [];

  return (
    <Card
      title={fileName ? `Alerts — ${fileName}` : "Alerts"}
      icon={<AlertIcon size={16} />}
      className="mx-auto max-w-3xl"
    >
      {events.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">
          {stats
            ? "No sudden movements detected in this video so far."
            : "Upload a video on the Dashboard to look for sudden movements."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">Sudden movement — bird #{e.track_id}</span>
                  <Badge tone={e.ratio >= 6 ? "danger" : "warning"}>
                    {e.trigger === "speed" ? "speed" : "acceleration"}
                  </Badge>
                </div>
                <p className="text-sm text-text-muted">
                  Reached {e.speed.toFixed(1)} body lengths/s, {e.ratio.toFixed(1)}× its own recent pace
                  ({e.baseline.toFixed(1)} BL/s).
                </p>
                <span className="text-xs text-secondary">
                  At {Math.round(e.position[0] * 100)}% across, {Math.round(e.position[1] * 100)}% down the frame
                </span>
              </div>
              <span className="whitespace-nowrap font-mono text-xs text-text-dim">{formatVideoTime(e.time_s)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
