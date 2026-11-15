import { Card } from "@/components/ui/Card";
import { GridIcon } from "@/components/ui/Icon";
import { StreamPanel } from "@/components/live_monitor/StreamPanel";
import { useVideoStore } from "@/store/videoStore";
import { ACTIVITY_COLOR, ACTIVITY_LABEL } from "@/theme";
import type { Track } from "@/types/video.types";

const NO_TRACKS: Track[] = [];

/** The annotated video at full width, plus the birds tracked in the current frame. */
export default function LiveMonitor() {
  const tracks = useVideoStore((s) => s.stats?.tracks) ?? NO_TRACKS;
  const fastestFirst = [...tracks].sort((a, b) => b.speed - a.speed);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <StreamPanel />
      </div>

      <Card title={`Tracked Birds (${tracks.length})`} icon={<GridIcon size={16} />} bodyClassName="p-0">
        {tracks.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">No birds tracked right now.</p>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="hud-label text-[10px]">
                  <th className="px-4 py-2 text-left">Bird</th>
                  <th className="px-2 py-2 text-left">State</th>
                  <th className="px-2 py-2 text-right">Speed (BL/s)</th>
                  <th className="px-4 py-2 text-right">Conf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fastestFirst.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-1.5 font-mono text-text">#{t.id}</td>
                    <td className="px-2 py-1.5">
                      <span className="flex items-center gap-2 text-text">
                        <span className="h-2 w-2 rounded-full" style={{ background: ACTIVITY_COLOR[t.state] }} />
                        {ACTIVITY_LABEL[t.state]}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-text">{t.speed.toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-right font-mono text-text-muted">{t.confidence.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
