import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="hud-metric text-6xl text-primary">404</div>
      <p className="text-text-muted">This screen doesn't exist.</p>
      <Link to="/" className="text-secondary hover:underline">
        Back to Dashboard
      </Link>
    </div>
  );
}
