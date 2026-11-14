import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertIcon } from "@/components/ui/Icon";
import { formatTime } from "@/utils/format";
import type { Alert, AlertSeverity } from "@/types/model.types";

const TONE: Record<AlertSeverity, "danger" | "warning" | "cyan"> = {
  critical: "danger",
  warning: "warning",
  info: "cyan",
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    api.getAlerts().then(setAlerts);
  }, []);

  return (
    <Card title="Alerts" icon={<AlertIcon size={16} />} className="mx-auto max-w-3xl">
      <ul className="divide-y divide-border">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">{a.title}</span>
                <Badge tone={TONE[a.severity]}>{a.severity}</Badge>
                {a.acknowledged && <span className="text-[11px] text-text-dim">acknowledged</span>}
              </div>
              <p className="text-sm text-text-muted">{a.message}</p>
              {a.zone && <span className="text-xs text-secondary">{a.zone}</span>}
            </div>
            <span className="whitespace-nowrap text-xs text-text-dim">{formatTime(a.timestamp)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
