import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { NavBar } from "./NavBar";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { useAppStore } from "@/store/appStore";
import { useVideoStore } from "@/store/videoStore";

const HEALTH_POLL_MS = 5_000;

/**
 * App shell: header + desktop nav + routed content + footer, with a mobile
 * bottom tab bar. Polls backend health; the alert badge is the number of
 * anomaly events in the current video.
 */
export function ProtectedLayout() {
  const checkHealth = useAppStore((s) => s.checkHealth);
  const alertCount = useVideoStore((s) => s.stats?.anomaly.total_events ?? 0);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [checkHealth]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header alertCount={alertCount} />
      <div className="border-b border-border bg-surface/40 px-4 py-2">
        <NavBar alertCount={alertCount} />
      </div>
      <main className="flex-1 px-4 py-4 pb-24 lg:pb-4">
        <Outlet />
      </main>
      <Footer />
      <BottomNav alertCount={alertCount} />
    </div>
  );
}
