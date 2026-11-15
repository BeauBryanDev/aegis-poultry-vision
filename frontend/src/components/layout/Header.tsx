import { Link } from "react-router-dom";
import { useAppStore, type BackendStatus } from "@/store/appStore";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/ui/Badge";
import { BellIcon } from "@/components/ui/Icon";
import { MODEL_NAME } from "@/utils/constants";

const BACKEND_BADGE: Record<BackendStatus, { tone: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  checking: { tone: "neutral", label: "Checking" },
  online: { tone: "success", label: "Online" },
  degraded: { tone: "warning", label: "Model not loaded" },
  offline: { tone: "danger", label: "Offline" },
};

/** Top header: brand, backend status, AI model, alerts, user. */
export function Header({ alertCount = 0 }: { alertCount?: number }) {
  const backend = useAppStore((s) => s.backend);
  const badge = BACKEND_BADGE[backend];

  return (
    <header className="neon-header flex flex-wrap items-center gap-3 bg-surface/80 px-4 py-3 backdrop-blur">
      <Logo className="mr-auto lg:mr-0" />

      <div className="hidden items-center gap-3 md:flex lg:mx-auto">
        <div className="rounded-card border border-border bg-surface px-3 py-2">
          <div className="hud-label text-[10px] leading-tight">Backend</div>
          <Badge tone={badge.tone} dot>
            {badge.label}
          </Badge>
        </div>
        <div className="rounded-card border border-border bg-surface px-3 py-2">
          <div className="hud-label text-[10px] leading-tight">AI Model</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text">{MODEL_NAME}</span>
            {backend === "online" && <Badge tone="primary">Active</Badge>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/alerts"
          className="relative rounded-card border border-border bg-surface p-2 text-text-muted hover:text-primary"
          aria-label="Alerts"
        >
          <BellIcon size={20} />
          {alertCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-feeding px-1 text-[10px] font-bold text-background">
              {alertCount}
            </span>
          )}
        </Link>
        <Avatar />
      </div>
    </header>
  );
}
