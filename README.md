# PoultryVisionAI

<div align="center">
  <img src="./frontend/src/assets/poultry_shield.webp" alt="PoultryVision shield" style="width:160px; border-radius:8px;">
</div>

## Overview

PoultryVisionAI is classic computer-vision software for monitoring poultry. It watches a flock on
video and reports three things:

* **Bird behavior** — how many birds are in view and whether each one is resting or active.
* **Anomalies in the flock** — birds that suddenly speed up compared with their own recent pace.
* **Predator events** — a predator entering the barn shows up as several birds bolting at once.

It is a classic computer-vision pipeline: a fine-tuned YOLO detector, ByteTrack tracking, and
kinematic rules (`dx/dt`, `dy/dt`, speed, acceleration) computed with plain NumPy and OpenCV.
There is no second neural network and no trained anomaly model.

**Current version (v1):** you upload a video in the web dashboard; the backend analyzes it and
streams it back annotated, with live counts and anomaly alerts. Live camera streaming is planned
for v2.

---

## How it works

```text
Uploaded video
      │
      ▼
YOLO11s detector (ONNX Runtime, CPU)        one class: chicken
      │
      ▼
Camera-motion compensation                  optical flow on the background
      │
      ▼
ByteTrack multi-object tracking             a stable ID per bird
      │
      ├──► Counting                         birds in frame, peak, unique tracks
      │
      ▼
Kinematics per bird                         vx = dx/dt, vy = dy/dt, speed, acceleration
      │
      ▼
Anomaly rule                                sudden speed-up vs. the bird's own baseline
      │
      ▼
OpenCV annotation ──► MJPEG stream + JSON stats ──► React dashboard
```

### Detection

A **YOLO11s** model fine-tuned on a single class (`Chicken`), exported to ONNX and run with
ONNX Runtime on CPU. Decoding and non-maximum suppression are written in NumPy; PyTorch and
Ultralytics are not needed at runtime.

| Model            | Dataset                      | mAP   | Notes                          |
|------------------|------------------------------|-------|--------------------------------|
| `chicken_v1`     | Mixed chicken / hen imagery  | 0.925 | The model the backend runs     |
| `PIO_chicken_v2` | PIO overhead (domain adapt.) | 0.865 | Crowded broiler barns, not wired in |

The training notebooks are in `ml/`. The backend loads the weights from
`model/chickens_model.onnx`.

### Tracking and counting

Detections are linked across frames with **ByteTrack** (from the `supervision` library), so each
bird keeps an ID. Three counts are reported:

* **Live count** — birds tracked in the current frame.
* **Peak count** — the highest live count so far.
* **Unique tracks** — each ID counted once. This runs above the real flock size when birds are
  hidden and re-appear or when the camera moves, because they get new IDs. Live and peak counts
  are the reliable numbers.

### Camera-motion compensation

If the camera pans, every box slides across the image even when no bird moves. The pipeline
follows background corners between frames with Lucas-Kanade optical flow and subtracts that
shift, so tracking and speeds are measured in stabilized coordinates. With a fixed camera this
does nothing.

### Kinematics

For every tracked bird, across a short time window:

```text
vx = dx / dt          vy = dy / dt
speed = sqrt(vx² + vy²)
accel = d(speed) / dt
```

Two details make these numbers usable on real footage:

* **Body lengths, not pixels.** Speed is divided by the bird's box size, giving body lengths per
  second (BL/s). A bird near the camera and one far away are judged the same way.
* **Rigid translation, not centroid.** `dx` counts only when the left and right box edges move
  the same way (likewise `dy` for top and bottom). When a neighbor hides part of a bird, its box
  changes shape and its centroid shifts, but the bird did not move; this reads as zero.

### Anomaly rule

A bird is flagged when **both** conditions hold for a sustained fraction of a second:

1. its speed is at least `ANOMALY_SPEED_BL`, **or** its acceleration is at least `ANOMALY_ACCEL_BL`
2. its speed is at least `ANOMALY_BASELINE_RATIO` × its own median speed over the last 2 seconds

The second condition is what makes the movement *sudden*: a bird that has been walking steadily
is not flagged, one that was standing still and darts away is. Each flagged bird produces one
event (bird ID, video time, speed, how many times its own pace, position in the frame) and is
drawn in red.

Every threshold is a setting in `app/core/config.py` and can be overridden in a `.env` file at
the repo root. The defaults were tuned on a fixed-camera clip in which a predator enters a calm
barn. They are sensitive: on handheld footage, a bird that simply starts walking can trigger an
event.

---

## Project layout

```text
app/                    FastAPI backend
  core/                 settings, constants, ONNX session, logging, startup
  vision/               one module per pipeline stage:
                        preprocess, detector, camera, tracker, counter,
                        kinematics, anomaly, annotate, pipeline
  routers/              health.py, video.py
tests/                  pytest suite (loads the real model)
frontend/               React dashboard
ml/                     training notebooks
model/                  chickens_model.onnx
ort/                    sample videos for manual checks
```

---

## Running it

### Backend

Requires Python 3.13 and the model file at `model/chickens_model.onnx`.

```bash
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload      # http://localhost:8000
python3 -m pytest                             # about 1 minute
```

### Frontend

```bash
cd frontend
npm install
npm run dev                                   # http://localhost:5173
```

Open `http://localhost:5173` and drop a video on the Dashboard. The dev server proxies `/api`
to the backend on port 8000.

---

## API

All routes are under `/api/v1`.

| Method | Route                  | What it does |
|--------|------------------------|--------------|
| `GET`  | `/health`              | Reports whether the model is loaded. |
| `POST` | `/upload`              | Accepts a video (MP4, AVI, MOV, MKV, WEBM; 250 MB max) and returns a `video_id`. |
| `GET`  | `/videos/{id}/stream`  | The annotated video as an MJPEG stream. Opening it starts the analysis; closing it cancels the analysis. One-shot. |
| `GET`  | `/videos/{id}/stats`   | Progress, counts, per-bird states and speeds, and anomaly events. Poll it while the stream runs. |

Nothing is stored. The upload is a temporary file deleted when its stream ends, and the stats
live in memory.

---

## Dashboard

React 18, TypeScript, Vite, Tailwind CSS, Zustand, Axios and Recharts, in a dark amber/cyan HUD
style.

* **Dashboard** — upload area and annotated stream, live / peak / unique counts, the
  resting / active / anomaly split, bird count over time, anomaly events, mean flock speed, and
  a JSON report download.
* **Monitor** — the stream at full width with a table of the birds tracked in the current frame.
* **Alerts** — one entry per anomaly event.
* Analytics, Reports, History and Settings are placeholders.

---

## Technology summary

| Layer     | Technologies                                                     |
|-----------|------------------------------------------------------------------|
| Detection | YOLO11s (fine-tuned), ONNX Runtime (CPU), NumPy decode + NMS     |
| Tracking  | ByteTrack (`supervision` 0.27.0.post2)                           |
| Motion    | OpenCV Lucas-Kanade optical flow, NumPy finite differences       |
| Anomaly   | Kinematic rules (speed and acceleration vs. each bird's baseline)|
| Backend   | Python 3.13, FastAPI, Uvicorn, pydantic-settings, pytest         |
| Frontend  | TypeScript, React, Vite, Tailwind CSS, Zustand, Axios, Recharts  |

---

## Known limits

* **Speed.** The detector takes about 190 ms per frame on a laptop CPU, so analysis runs at
  roughly 5 frames per second. `FRAME_STRIDE=2` processes every other frame.
* **Unique count** over-counts under occlusion and camera motion (see above).
* **Sensitivity.** The anomaly thresholds were tuned on one synthetic clip. Real barn footage
  with a real disturbance is still needed to validate them.
* **Single model.** A predator is inferred from how the birds react; the predator itself is not
  detected.

---

## Roadmap

* Live camera stream over WebSocket (v2).
* Validation on real barn footage with real disturbances.
* Remaining dashboard screens (Analytics, Reports, History, Settings).

**Pending: flock-level speed rule** — raise an alarm when several birds speed up at the same
time. One hen walking off and a predator entering the barn can look alike bird by bird; many
birds bolting in the same moment is what sets a predator apart.

---

## License

See [LICENSE](./LICENSE). Detection uses Ultralytics YOLO11 weights (AGPL-3.0); tracking uses
ByteTrack from [supervision](https://github.com/roboflow/supervision).
