# PITWALL // AI RACE ENGINEER
### THE CINEMATIC RECONSTRUCTION OF PEAK PERFORMANCE

<div align="center">

[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20IBM%20Granite-cyan?style=for-the-badge)](https://github.com/labreo/pitwall)
[![Performance](https://img.shields.io/badge/Replay-60FPS%20Deterministic-emerald?style=for-the-badge)](https://github.com/labreo/pitwall)
[![IBM Granite](https://img.shields.io/badge/AI-IBM%20Granite-violet?style=for-the-badge)](https://github.com/labreo/pitwall)
[![IBM Docling](https://img.shields.io/badge/Knowledge-IBM%20Docling-blue?style=for-the-badge)](https://github.com/labreo/pitwall)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

<!-- 
  IMAGE 1: HERO BANNER
  Shoot: Full-screen screenshot of the replay environment mid-session.
  The car marker should be mid-corner on the GPS trace, the timing HUD
  showing a green delta, ghost visible on track, coaching radio subtitle
  active on screen. This is the first thing judges see. Make it cinematic.
  Suggested filename: docs/images/hero_replay.png
-->
<div align="center">
  <img src="docs/images/hero_replay.png" alt="PitWall Replay Environment" width="100%"/>
  <p><em>PitWall Mission Control — Real GPS trace, deterministic replay, IBM Granite coaching</em></p>
</div>

---

> **PitWall is not a dashboard.**  
> It is a cinematic AI race engineering system that transforms raw GoPro footage into a professional-grade performance reconstruction — the same intelligence F1 teams pay millions for, available to any driver with a camera.

---

## 01 // THE PROBLEM

Every weekend, thousands of amateur and club racing drivers hit track days. They have GoPro cameras. They have footage. After every session they have **zero engineering feedback.**

A professional race engineer analyzes telemetry, identifies braking points, spots consistency failures, and tells the driver exactly what to fix. This costs £500–£2000 per day and is standard at every professional level. Below that, it doesn't exist.

The gap is not the data. The GoPro in their bag is already recording GPS at 18Hz, G-force at 200Hz, and speed continuously. **The gap is the engineering intelligence to interpret it.**

PitWall closes that gap completely.

---

## 02 // THE SOLUTION

One upload. Four phases. Professional intelligence.

```
GoPro Footage Upload
        ↓
Cinematic Forensics Sequence
(GPMF extraction → lap detection → corner segmentation → session build)
        ↓
Mission Control Replay
(GPS trace · telemetry HUD · ghost racing · track intelligence layers · Granite coaching)
        ↓
Theoretical Best Lap Reconstruction
(fastest sectors stitched · video sync · sector provenance)
        ↓
Intelligence Summary
(consistency score · critical corners · driver strengths · actionable priorities)
```

---

## 03 // CORE CAPABILITIES

### 🏁 THEORETICAL BEST LAP GENERATOR

<!-- 
  IMAGE 2: THEORETICAL BEST LAP
  Shoot: The moment the perfect lap reconstruction triggers. The cinematic
  overlay should be visible. Show the sector callout UI — "BEST EXIT // FROM LAP 3"
  — with the video jumping to the correct footage in the background.
  This is your most unique feature. Give it the most dramatic screenshot.
  Suggested filename: docs/images/theoretical_best.png
-->
<div align="center">
  <img src="docs/images/theoretical_best.png" alt="Theoretical Best Lap Reconstruction" width="85%"/>
  <p><em>The Perfect Lap — constructed from your best sectors, played back with your real footage</em></p>
</div>

The centrepiece of PitWall. The system identifies the fastest version of every geographic sector across your session and stitches them into a seamless composite lap that never actually happened — then plays it back with your real GoPro footage synchronized to each sector.

**How it works:**
- Every lap is divided into geographic sectors using GPS coordinate clustering
- The fastest recorded time through each sector is identified across all laps
- A seamless composite replay is constructed from these optimal segments
- The background video automatically jumps to the correct lap footage for each sector
- HUD callouts identify the provenance of each best segment: *"BEST EXIT // FROM LAP 3"*

**Why it matters:** No other amateur motorsport tool reconstructs a theoretical best lap with real video sync. You watch the best version of yourself that never existed.

---

### 📡 MISSION CONTROL REPLAY

<!-- 
  IMAGE 3: MISSION CONTROL OVERVIEW
  Shoot: Wide view of the full replay environment. Show all elements
  simultaneously — GPS trace with speed gradient coloring, animated car
  marker, timing HUD in corner, video playing in background, coaching
  radio subtitle active. Capture it during an active replay not paused.
  Suggested filename: docs/images/mission_control.png
-->
<div align="center">
  <img src="docs/images/mission_control.png" alt="Mission Control Replay" width="85%"/>
  <p><em>Mission Control — synchronized video, telemetry, GPS trace, and ghost racing simultaneously</em></p>
</div>

A high-performance motorsport broadcast environment powered by a **60FPS Deterministic Replay Engine**. Unlike standard web video players, Mission Control treats your session as a living physics simulation.

#### 👻 THE GHOST SYSTEM // YOUR SILENT BENCHMARK
The Ghost System is the heart of PitWall's competitive analysis. It doesn't just show a line; it reconstructs your fastest session lap as a dynamic, semi-transparent entity that races alongside you in real-time.

- **Cross-Lap Synchronization** — Most systems fail to compare Lap 2 against Lap 1 because segment IDs change. PitWall uses a **Stable Split Indexing** algorithm that correlates your current position against the optimal ghost regardless of lap count or session drift.
- **Dynamic Delta Projection** — The system computes your gap to the ghost at 60Hz. The HUD displays a precision **Live Delta** (e.g., `-0.145s`) that pulses gold for sector records, green for personal bests, and red for time loss.
- **Interpolated Persistence** — The ghost doesn't "teleport" between GPS pings. We use high-order linear interpolation to ensure the ghost moves with the same fluid motion as the live car, providing a perfect visual reference for braking points and apex speeds.

#### ⏱️ DETERMINISTIC SPLIT ENGINE
To achieve professional-grade timing, we rebuilt the replay core from the ground up:

- **State-Machine-Driven Timing** — All sector times, lap deltas, and "Theoretical Best" updates are managed by a central `SplitStateMachine`. This ensures that if you scrub the replay to a specific timestamp, the timing HUD shows the *exact* state it would have been in during a live run.
- **Isolated Sector Analysis** — PitWall separates your current lap performance from your sector performance. You can be 5 seconds down on your lap time but still set a "Purple Sector" for a specific corner. The system isolates your technique from your total lap "debt."
- **Zero-Latency Rendering** — By bypassing React's reconciliation loop and using direct D3 imperative writes, the replay engine maintains a locked 60FPS. This eliminates the "UI jitter" common in web-based telemetry tools.

---

---

### 🔥 TRACK INTELLIGENCE LAYERS

<!-- 
  IMAGE 4: TRACK INTELLIGENCE LAYERS
  Shoot: The track map with intelligence overlays toggled ON.
  Ideal shot: Consistency Heat Layer active showing green-to-red gradient
  across the circuit, with Braking Zone clouds visible at the heavy
  braking zones. The car marker should be visible on the trace.
  Toggle between layers and pick the most visually dramatic frame.
  Suggested filename: docs/images/track_intelligence.png
-->
<div align="center">
  <img src="docs/images/track_intelligence.png" alt="Track Intelligence Layers" width="85%"/>
  <p><em>Track Intelligence — the circuit surface becomes a live performance analysis layer</em></p>
</div>

The GPS track map is not a static visualization. It is a live performance surface with toggleable intelligence overlays:

| Layer | What It Shows |
|---|---|
| **Racing Line** | Actual GPS path of each lap — the base visual truth |
| **Consistency Heat** | Green → red variance map showing line repeatability across the circuit |
| **Braking Zones** | Translucent heatmap clouds showing where braking begins and how consistent it is |
| **Corner Analytics** | Real-time corner classification firing as the car passes each segment |

The track itself becomes the analysis surface. This approach — continuous spatial intelligence across the full circuit rather than discrete event markers — is the core design philosophy of PitWall's visualization layer.

> **Design note:** This visualization approach is inspired by cricket's Wagon Wheel statistic, adapted from discrete event mapping into a continuous spatial intelligence model for motorsport.

---

### 🧠 IBM-ENHANCED COACHING

<!-- 
  IMAGE 5: GRANITE COACHING RADIO
  Shoot: The coaching radio subtitle firing mid-corner during replay.
  The subtitle should show a specific, data-referenced coaching line —
  ideally something like "Turn 3 — braking 12m late, exit 132 vs target 145."
  Show the HUD and the track map in the same frame so context is clear.
  Suggested filename: docs/images/coaching_radio.png
-->
<div align="center">
  <img src="docs/images/coaching_radio.png" alt="IBM Granite Coaching Radio" width="85%"/>
  <p><em>Engineer Radio — IPitWall uses a sophisticated two-layer intelligence architecture—**The Brain**—that separates deterministic physics from probabilistic narrative:</em></p>
</div>

#### 🏗️ LAYER 1 // THE PHYSICS ENGINE
Before a single word is generated, our deterministic Python pipeline processes your raw GPMF metadata into high-fidelity performance metrics:
- **Deceleration Forensics** — Identification of Braking-of-Beginning (BoB) and End-of-Braking (EoB) markers via longitudinal G-force thresholding.
- **Apex Profiling** — Real-time curvature calculation to identify the true geometric apex vs. the driver's steered apex.
- **Line Consistency Scoring** — Spatial variance analysis using the Hausdorff distance between GPS traces of different laps.

#### 🏗️ LAYER 2 // THE NARRATIVE ENGINE (IBM GRANITE)
Once the physics are locked, **IBM Granite** takes over as your virtual Race Engineer. We ensure every coaching line is grounded in reality through a **RAG (Retrieval-Augmented Generation)** pipeline:

- **IBM Docling Knowledge Base** — We used **IBM Docling** to ingest thousands of pages of professional racing theory, track guides, and vehicle dynamics references. These are chunked, embedded, and stored in a local vector index.
- **Dynamic Theory Injection** — When the Physics Engine detects a mistake (e.g., poor trail-braking), Granite queries the knowledge base for specific technical theory related to that error and injects it into the coaching prompt.
- **Repetition-Aware Logic** — PitWall tracks session-wide coaching history. If you repeat a mistake, Granite is instructed to pivot—focusing on a different nuance or increasing the technical urgency of the feedback.
- **Deterministic Grounding** — Granite is strictly prohibited from inventing physics. It acts as the *narrator* of Layer 1's findings, ensuring that advice like *"You're 12m late on the brakes"* is based on computed telemetry, not an LLM hallucination.

**Result:** You get coaching that feels like a real engineer referencing a playbook, not a generic motivational AI assistant.

---

### 📊 INTELLIGENCE SUMMARY

<!-- 
  IMAGE 6: INTELLIGENCE SUMMARY SCREEN
  Shoot: The full Intelligence Summary screen after a complete session.
  Show the PB vs Theoretical Best delta prominently, the consistency
  score, and at least two Critical Corner cards with their mini-maps.
  If Driver Strengths are visible include those too.
  Suggested filename: docs/images/intelligence_summary.png
-->
<div align="center">
  <img src="docs/images/intelligence_summary.png" alt="Intelligence Summary" width="85%"/>
  <p><em>Intelligence Summary — the race engineer debrief, generated automatically after every session</em></p>
</div>

When the session ends, PitWall automatically generates a complete race engineering debrief:

- **PB vs Theoretical Best** — exact potential gain in seconds (e.g. *-1.245s*)
- **Consistency Score** — 0–100 calculated from flying-lap variance, ignoring out-laps
- **Critical Time Loss Corners** — top 3 corners costing the most time, each with a mini-map wireframe and IBM Granite recommendation
- **Driver Strengths** — technical skill recognition: Brake Stability, Line Precision, Throttle Control
- **Actionable Priorities** — specific to-do list for next session

---

## 04 // IBM AI INTEGRATION

| IBM Tool | Role | Integration Point |
|---|---|---|
| **IBM Granite** | Coaching language generation + Intelligence Summary recommendations | Receives structured corner performance data from the physics engine. Produces coaching lines and debrief text. |
| **IBM Docling** | Racing theory PDF parsing → structured knowledge base | Pre-parses FIA regulations, racing line theory, and track guides. Grounds all Granite output in real motorsport knowledge. |

**Architecture principle:** IBM tools sit on top of deterministic engineering. Granite is the narrator of findings produced by real algorithms. Every coaching line is traceable to a specific computed metric — not an LLM estimate.

---

## 05 // SYSTEM ARCHITECTURE

```mermaid
graph TD
    A[GoPro MP4 Upload] --> B[ffmpeg GPMF Extraction]
    B --> C[gopro2json Parsing]
    C --> D["Normalization · 10Hz Resampling"]
    D --> E["Lap Detection · Heading-Based Crossing"]
    E --> F["Corner Segmentation · Curvature Algorithm"]
    F --> G["Corner Profiling · Entry/Apex/Exit"]
    G --> H["Session JSON · D3-Ready Output"]

    H --> I[Physics Intelligence Engine]
    I --> J[Braking Point Analysis]
    I --> K[Consistency Scoring]
    I --> L[Sector Delta Calculation]
    I --> M[Theoretical Best Assembler]

    subgraph IBM_AI_Pipeline ["IBM AI Pipeline"]
    N["IBM Docling · Racing PDFs"] --> O[Knowledge Base]
    O --> P["IBM Granite · Coaching Generation"]
    P --> Q["Coaching Scheduler · Timestamp Sync"]
    end

    I --> P
    M --> R[Video Sector Sync]

    subgraph Frontend_Mission_Control ["Frontend · Mission Control"]
    S[D3 GPS Trace Player]
    T["TelemetryHUD · Live Readouts"]
    U[Ghost Racing Engine]
    V[Track Intelligence Layers]
    W[Perfect Lap Reconstruction]
    X[Intelligence Summary]
    end

    Q --> S
    R --> W
    H --> S
```

---

## 06 // TECHNICAL ARCHITECTURE

### Data Pipeline

| Stage | Technology | Output |
|---|---|---|
| Video ingest | ffmpeg, gopro2json | Raw GPMF telemetry stream |
| Normalization | Python, NumPy, Pandas | 10Hz synchronized timeline |
| Lap detection | Custom heading-crossing algorithm | 9 laps · ~109s average · Donington Park |
| Corner segmentation | GPS curvature algorithm | Entry/apex/exit per corner with confidence score |
| Session output | Normalized JSON | D3-ready structured session object |

### Replay Engine

| Component | Technology | Design Decision |
|---|---|---|
| Replay loop | requestAnimationFrame | Runs outside React render cycle entirely |
| Track rendering | D3.js imperative SVG | Zero React re-renders during playback |
| State management | Zustand | Low-frequency UI state only |
| HUD updates | DOM Ref callbacks | Direct DOM writes for zero-latency telemetry display |
| Ghost system | Interpolation-based replay | Timestamp-synchronized against replay engine clock |

### Why GPS, Not TORCS

TORCS provides ~30 fixed predefined tracks. Real drivers race everywhere. PitWall renders the driver's actual GPS trace — their real circuit, drawn from their own coordinates. This means PitWall works on any track in the world from a single upload.

The TORCS GitHub Learning Lab is completed separately as the IBM submission requirement.

---

## 07 // DEMO DATA

The prototype is validated on real telemetry from a professional motorcycle rider at **Donington Park** (No-Limits-Racing 765RS Cup). The dataset contains 9 complete flying laps at approximately 109 seconds per lap, extracted from GoPro Hero GPMF metadata.

PitWall is vehicle-agnostic. The telemetry pipeline reads GoPro GPMF streams identically for cars and motorcycles. The Donington Park dataset was selected for its data quality and public availability.

<!-- 
  IMAGE 7: DONINGTON TRACK RECONSTRUCTION
  Shoot: The refined_track_segments.png output from your Python pipeline
  OR a screenshot of the GPS trace rendered in the frontend showing the
  full Donington Park layout reconstructed from real GPS coordinates.
  Label it clearly — judges need to see this is a real track, not a template.
  Suggested filename: docs/images/donington_reconstruction.png
-->
<div align="center">
  <img src="docs/images/donington_reconstruction.png" alt="Donington Park GPS Reconstruction" width="70%"/>
  <p><em>Donington Park reconstructed from raw GPS coordinates — no template, no fixed map</em></p>
</div>

---

## 08 // GETTING STARTED

### Prerequisites

- Python 3.10+
- Node.js 18+
- FFmpeg (with GPMF metadata support)
- Ollama running `granite3.1-dense:2b` or `granite-3.0-8b-instruct`

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/labreo/pitwall
cd pitwall
```

**2. Backend setup**
```bash
cd backend
pip install -r requirements.txt
python -m app
```

**3. Frontend setup**
```bash
cd frontend
npm install
npm run dev
```

**4. Ollama setup**
```bash
ollama pull granite3.1-dense:2b
ollama serve
```

### Upload Your Own Data

PitWall accepts GoPro Hero 5+ footage natively. GPS must be enabled on the camera before recording. For best results:
- Enable GPS in GoPro settings before every session
- Mount the camera securely to minimize vibration noise
- Ensure at least 3 complete flying laps for meaningful consistency analysis

Compatible GPS data sources: GoPro Hero 5+, Racelogic VBOX, AiM Solo, Harry's LapTimer, TrackAddict.

---

## 09 // THE TECH STACK

| Component | Technology |
|---|---|
| Frontend framework | React 18, Vite, TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| State management | Zustand |
| Replay rendering | D3.js (imperative SVG) |
| Backend API | FastAPI, Python |
| Video processing | ffmpeg, gopro2json |
| Telemetry analysis | NumPy, Pandas |
| AI model | IBM Granite (via Ollama) |
| Knowledge base | IBM Docling (PDF Parsing + FAISS RAG) |
| Timing Engine | Deterministic Split State Machine |
| Demo dataset | Donington Park · 9 laps · GoPro GPMF |

---

## 10 // ROADMAP

- [ ] **Watson TTS** — Real-time AI engineer voiceover during replay
- [ ] **Granite Vision** — Automatic detection of track hazards, flags, and competitor positions from raw video frames
- [ ] **The Garage** — Persistent session history for multi-day driver progress tracking
- [ ] **Cloud Reconstruction** — IBM Cloud offloading for heavy GPMF extraction on mobile upload
- [ ] **GPS → TORCS Converter** — Convert any real GPS trace into a drivable TORCS track file
- [ ] **Multi-Driver Comparison** — Upload sessions from two drivers on the same track, compare lines directly

---

## 11 // WHY THIS MATTERS

Professional racing has moved beyond driving fast and into data engineering. Teams employ dedicated data analysts, simulation engineers, and race strategists. The result is a sport where the car and the data are inseparable.

Amateur drivers operate with none of this infrastructure. They return from a track day with gigabytes of footage and the same question they had before: *where am I losing time?*

PitWall answers that question — corner by corner, sector by sector, lap by lap — with the same rigour a professional engineer would apply. Not approximately. Not generically. With specific, referenced, actionable findings derived from the driver's own data.

Every driver deserves a seat at the engineering table. PitWall builds it.

---

## 12 // PROJECT

Built for the **IBM AI Builders Challenge 2026** — Racing Innovation Challenge.

**IBM Technologies Used:** IBM Granite · IBM Docling

**Demo:** [3-minute video link]

**Live prototype:** [deployment link if available]

---

<div align="center">
  <sub>PitWall · Built by Kanak Waradkar · github.com/Labreo</sub>
</div>