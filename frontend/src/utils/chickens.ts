/** Derives dashboard view models from the backend stats. */

import type { ActivityBreakdown, Zone } from "@/types/model.types";
import { BIRD_STATES, type VideoStats } from "@/types/video.types";

/** Count and share of the flock per activity state. */
export function activityBreakdown(stats: VideoStats | null): ActivityBreakdown[] {
  const total = stats?.live_count ?? 0;

  return BIRD_STATES.map((state) => {
    const count = stats?.states[state] ?? 0;
    return { state, count, percent: total ? (count / total) * 100 : 0 };
  });
}

/** Birds per quadrant of the frame (by box center): 1 2 / 3 4. */
export function zoneCounts(stats: VideoStats | null): Zone[] {
  const counts = [0, 0, 0, 0];

  for (const track of stats?.tracks ?? []) {
    const cx = (track.box[0] + track.box[2]) / 2;
    const cy = (track.box[1] + track.box[3]) / 2;
    counts[(cy >= 0.5 ? 2 : 0) + (cx >= 0.5 ? 1 : 0)] += 1;
  }

  return counts.map((count, i) => ({ id: `z${i + 1}`, name: `Zone ${i + 1}`, count }));
}
