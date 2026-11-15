import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FullscreenIcon, StopIcon, UploadIcon } from "@/components/ui/Icon";
import { FPSIndicator } from "./FPSIndicator";
import { streamImage, useVideoStore, type VideoPhase } from "@/store/videoStore";
import { ACTIVITY_COLOR, ACTIVITY_LABEL } from "@/theme";
import { BIRD_STATES } from "@/types/video.types";
import { MODEL_NAME, VIDEO_ACCEPT } from "@/utils/constants";
import { cx, formatNumber, formatPercent } from "@/utils/format";

const PHASE_BADGE: Record<VideoPhase, { tone: "success" | "neutral" | "primary" | "danger" | "cyan"; label: string }> = {
  idle: { tone: "neutral", label: "No video" },
  uploading: { tone: "primary", label: "Uploading" },
  processing: { tone: "success", label: "Analyzing" },
  done: { tone: "cyan", label: "Finished" },
  cancelled: { tone: "neutral", label: "Stopped" },
  error: { tone: "danger", label: "Error" },
};

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2">
      <div className="hud-label text-[10px] leading-tight">{label}</div>
      <div className="truncate text-sm font-medium text-text">{value}</div>
    </div>
  );
}

/** Center column: upload a video and watch the server-annotated stream. */
export function StreamPanel() {
  const { phase, fileName, uploadProgress, error, hasFrame, stats, upload, stop } = useVideoStore();

  const surfaceRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Attach the store-owned <img> while this panel is on screen. It keeps
  // streaming when we unmount, so leaving the page does not cancel the run.
  useEffect(() => {
    const holder = frameRef.current;
    if (!holder) return;
    streamImage.className = "h-full w-full object-contain";
    holder.appendChild(streamImage);
    return () => {
      if (streamImage.parentNode === holder) holder.removeChild(streamImage);
    };
  }, []);

  const busy = phase === "uploading" || phase === "processing";
  const badge = PHASE_BADGE[phase];
  const thresholds = stats?.anomaly.thresholds;

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !busy) upload(file);
  };

  return (
    <Card
      glow="cyan"
      title={fileName ? `Video Analysis — ${fileName}` : "Video Analysis"}
      action={
        <div className="flex items-center gap-3">
          <Badge tone={badge.tone} dot>
            {badge.label}
          </Badge>
          <button
            aria-label="Fullscreen"
            title="Fullscreen"
            className="text-text-muted hover:text-primary"
            onClick={() => surfaceRef.current?.requestFullscreen?.()}
          >
            <FullscreenIcon size={16} />
          </button>
        </div>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = ""; // allow picking the same file again
        }}
      />

      <div
        ref={surfaceRef}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cx(
          "relative aspect-video w-full overflow-hidden rounded-card border bg-black",
          dragging ? "border-primary" : "border-border",
        )}
      >
        {/* Annotated frames (boxes, IDs and counters are drawn by the server) */}
        <div ref={frameRef} className={cx("absolute inset-0", !hasFrame && "hidden")} />

        {/* Upload / status overlay */}
        {!hasFrame && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#141007] via-[#0b0b0e] to-[#0b120f] px-4 text-center">
            <UploadIcon size={32} className="text-primary" />
            {phase === "uploading" ? (
              <>
                <p className="text-sm text-text-muted">Uploading {fileName}…</p>
                <div className="h-1.5 w-56 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-primary" style={{ width: `${uploadProgress * 100}%` }} />
                </div>
                <p className="hud-metric text-sm text-primary">{formatPercent(uploadProgress * 100, 0)}</p>
              </>
            ) : (
              <>
                {phase === "error" && (
                  <p className="max-w-md text-sm text-status-anomaly">{error ?? "Something went wrong."}</p>
                )}
                {phase === "cancelled" && <p className="text-sm text-text-muted">Analysis stopped.</p>}
                <p className="text-sm text-text-muted">
                  Drop a chicken video here, or choose a file to analyze.
                </p>
                <p className="text-xs text-text-dim">MP4, AVI, MOV, MKV or WEBM</p>
                <Button size="sm" onClick={() => inputRef.current?.click()}>
                  <UploadIcon size={16} />
                  Choose video
                </Button>
              </>
            )}
          </div>
        )}

        {hasFrame && stats && (
          <>
            {/* top-right: the server draws its own counter panel top-left */}
            <div className="absolute right-3 top-3">
              <FPSIndicator fps={stats.processing_fps} />
            </div>

            <div className="absolute bottom-10 right-3 flex flex-col gap-1 rounded border border-border bg-background/70 px-2 py-1.5 backdrop-blur">
              {BIRD_STATES.map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs text-text">
                  <span className="h-2 w-2 rounded-full" style={{ background: ACTIVITY_COLOR[s] }} />
                  {ACTIVITY_LABEL[s]}
                </div>
              ))}
            </div>

            {/* Progress through the video */}
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded border border-border bg-background/70 px-2 py-1.5 backdrop-blur">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-secondary transition-[width]"
                  style={{ width: `${stats.progress * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs text-text">
                {formatNumber(stats.frame_index)} / {formatNumber(stats.frame_count)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Readout label="Model" value={MODEL_NAME} />
        <Readout label="Speed threshold" value={thresholds ? `${thresholds.speed} BL/s` : "—"} />
        <Readout label="Accel threshold" value={thresholds ? `${thresholds.accel} BL/s²` : "—"} />
        <Readout label="Baseline ratio" value={thresholds ? `× ${thresholds.baseline_ratio}` : "—"} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          <UploadIcon size={16} />
          {phase === "idle" ? "Upload video" : "Analyze another video"}
        </Button>
        <Button size="sm" variant="outline" disabled={phase !== "processing"} onClick={stop}>
          <StopIcon size={16} />
          Stop
        </Button>
        <span className="text-xs text-text-dim">
          BL = body lengths. A bird is flagged when it suddenly moves this much faster than its own recent pace.
        </span>
      </div>
    </Card>
  );
}
