# Canara Engineering College – Indoor Campus Navigation

> **Sudhindra Nagar, Benjanapadavu, Bantwal Taluk, Karnataka 574219**  
> Fast, dependable, mobile-first indoor navigation web app for students and faculty across all 4 floors. Fully offline-capable via Service Worker caching.

---

## Architecture & Technology Stack

- **Frontend**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 (Restrained Canara College palette: Navy `#0f3b7a`, Gold/Amber `#d97706`, Slate neutrals)
- **Data Model**: Single source of truth at [`public/data/campus.json`](public/data/campus.json)
- **Routing Engine**: Dijkstra / A* multi-floor pathfinder with accessibility constraints (lift-only mode) and landmark-based turn instructions
- **Offline PWA**: Custom Service Worker caching HTML shell, blueprints, data, and icons
- **Icons**: Lucide React line icons (consistent stroke, zero emoji icons)

---

## 4 Floors Overview (Class Room Block)

| Floor | Code | Image Asset | Key Facilities & Landmarks |
|---|---|---|---|
| **Ground Floor** | `GF` | `1000073941_367166a1.jpg` | Main Entry Lobby, Classrooms 01–09, HOD Offices, Staff Rooms 01–03, Lift-02, Central Stairs |
| **1st Floor** | `1F` | `1000073949_21a5a4cc.jpg` | Classrooms 01–09, HOD Suites, Staff Rooms, Central Staircase & Lift-02 |
| **2nd Floor** | `2F` | `1000073957_ddb04104.jpg` | Classrooms 01–08, Staff Rooms 01–03, Central Lobby & Lift-02 |
| **3rd Floor** | `3F` | `1000073959_ac649ee1.jpg` | Classrooms 01–07, Staffroom, Ladies & Gents Washrooms, Maintenance, Lift-03 |

*Inter-block connections connect the Class Room Block to the Central Library (GF/TF) and Admin Block (GF/2F).*

---

## Quick Start (Run Locally)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser (or on your phone on the same Wi-Fi using the displayed network IP).

To build for production:
```bash
npm run build
npm run preview
```

---

## How to Add or Update a Room

All rooms and facilities are defined in [`public/data/campus.json`](public/data/campus.json). To add a room:

1. Open `public/data/campus.json`.
2. Locate the `"rooms"` array and append a new entry:

```json
{
  "id": "loc_crb_1f_cr10",
  "number": "CR-110",
  "name": "Class Room 10 (AI & DS Lab)",
  "department": "Artificial Intelligence & Data Science",
  "floor": "first",
  "nodeId": "node_crb_ff_cr05",
  "category": "classroom",
  "keywords": ["ai lab", "data science", "cr110", "room 110", "110"],
  "description": "Artificial Intelligence lab on the First Floor north wing.",
  "hint": "1st Floor, north wing past HOD Suites"
}
```

3. Save the file. The changes are immediately available across search and routing without rebuilding the codebase.

---

## How to Add a New Floor

1. Place the architectural blueprint image or SVG into `public/assets/` (e.g. `/assets/floor_4th.jpg`).
2. Open [`public/data/campus.json`](public/data/campus.json) and add an object to `"floors"`:

```json
{
  "id": "fourth",
  "name": "4th Floor",
  "shortName": "4F",
  "floorNumber": 4,
  "image": "/assets/floor_4th.jpg",
  "scale": 1.0,
  "description": "Auditorium & Innovation Hub"
}
```

3. Add hallway nodes for the new floor under `"nodes"`:
```json
{
  "id": "node_4f_stair",
  "floor": "fourth",
  "x": 465,
  "y": 455,
  "type": "stairs",
  "name": "Central Staircase (4F)",
  "building": "block_classroom"
}
```

4. Connect the new floor's stairs or lift to the 3rd floor in `"edges"`:
```json
{
  "id": "c_stair_3_4",
  "source": "node_crb_tf_stair",
  "target": "node_4f_stair",
  "distance": 8,
  "type": "stairs",
  "accessible": false
}
```

---

## Dev-Only "Edit Mode" (Interactive Node Placer)

Instead of manually editing coordinates in JSON, use the built-in visual editor:

1. Click **"Edit Mode"** in the top navigation bar.
2. Select your tool:
   - **Add**: Choose a node type (`corridor junction`, `room`, `stairs`, `lift`, etc.) and click anywhere on the floor plan to drop a node.
   - **Move**: Click and drag existing nodes to align them with corridors.
   - **Connect**: Click Node 1, then click Node 2 to create an edge. The distance in meters is calculated automatically based on scale.
   - **Delete**: Click any node to remove it and its connections.
3. Click **"Export campus.json"** in the floating editor panel to download the updated JSON file directly to your computer.

---

## How to Generate & Use QR Codes for Preset Checkpoints

QR codes allow students to scan a physical sticker in the building (at room doors, entrance lobbies, or stair landings) to immediately locate themselves on their phones:

1. **URL Format**:
   - Preset location: `https://[your-domain]/?at=CR-104` or `/?at=room-203`
   - Preset route: `https://[your-domain]/?from=CR-001&to=CR-305&pref=shortest`
2. **Built-in QR Generator**:
   - In the app, click **"Set Start / QR"** in the top header.
   - Switch to the **"Generate & Print"** tab.
   - Select any building checkpoint or room (e.g. *"Class Room Block GF Lobby"*, *"Room 204"*).
   - Click **"Print Checkpoint Sheet"** to generate high-resolution, printable physical QR stickers.
3. When scanned with a smartphone camera, the browser immediately opens the navigation app with the student's "You Are Here" position already established.

---

## Verification: 10 Tested Sample Routes

All routes were verified against the graph model using [`scripts/testCampusRoutes.ts`](scripts/testCampusRoutes.ts) (`npx tsx scripts/testCampusRoutes.ts`):

| # | Route Test Case | Floors Traversed | Distance | Transition Via | Result |
|---|---|---|---|---|---|
| 1 | Single Floor: Main Gate to CR-001 (Ground Floor) | Ground | 67m | Same Level | **PASSED** |
| 2 | Ground Floor: CR-001 to CR-006 (Across corridor) | Ground | 58m | Same Level | **PASSED** |
| 3 | Cross-Floor (GF → 1F): Main Entrance to CR-004 (1st Floor) | Ground → 1st | 67m | Lift / Stairs | **PASSED** |
| 4 | Cross-Floor (GF → 2F): CR-002 (GF) to CR-005 (2nd Floor) | Ground → 1st → 2nd | 95m | Central Stairs | **PASSED** |
| 5 | Cross-Floor (GF → 3F): Main Entrance to 3rd Floor Ladies Washroom | Ground → 1st → 2nd → 3rd | 88m | Central Stairs | **PASSED** |
| 6 | **Accessible Lift-Only (GF → 3F)**: GF Lobby to 3rd Floor CR-005 | Ground → 1st → 2nd → 3rd | 75m | **Lift-02/03 Only** | **PASSED** |
| 7 | Cross-Floor (1F → 3F): 1st Floor HOD Office to 3rd Floor Staffroom | 1st → 2nd → 3rd | 84m | Central Stairs | **PASSED** |
| 8 | Inter-Block Cross-Floor: Class Room Block 1F to Library Block TF (Lab 01) | 1st → Ground → 3rd | 243m | Covered Walkway + Stairs | **PASSED** |
| 9 | Inter-Block Cross-Floor: Class Room Block GF to Admin Block 2F (Computer Lab 02) | Ground → 2nd | 185m | Covered Walkway + Stairs | **PASSED** |
| 10 | Reverse Multi-Floor (3F → GF): 3rd Floor Gents Washroom to Main Campus Gate | 3rd → 2nd → 1st → Ground | 143m | Central Stairs + Avenue | **PASSED** |
