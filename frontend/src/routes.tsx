import { createBrowserRouter } from "react-router-dom";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import Dashboard from "@/pages/Dashboard";
import LiveMonitor from "@/pages/LiveMonitor";
import Analytics from "@/pages/Analytics";
import Reports from "@/pages/Reports";
import Alerts from "@/pages/Alerts";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "monitor", element: <LiveMonitor /> },
      { path: "analytics", element: <Analytics /> },
      { path: "reports", element: <Reports /> },
      { path: "alerts", element: <Alerts /> },
      { path: "history", element: <History /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
