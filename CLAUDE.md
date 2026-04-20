# Mouse Masters — Project Guide

## Stack

This is a web-based mouse training game built with:

- **React + Tailwind CSS** for all UI (dashboard, menus, settings, progress screens)
- **Phaser 4 + TypeScript** for all game canvases (Dragon Drop, Shape Finder, Rocket Rush)
- **Vite** as the bundler
- Will be integrated into the **Bilism Garaji LMS** system

---

## Architecture Rules

- **NEVER** use Phaser for UI screens — only for actual gameplay canvas
- **NEVER** use React inside Phaser scenes
- Games are mounted/unmounted dynamically when user clicks PLAY and returns to dashboard

---

## Games

| Scene key    | Teaches            |
|--------------|--------------------|
| DragonDrop   | Click & Drag       |
| ShapeFinder  | Double Click       |
| RocketRush   | Left & Right Click |

---

## LMS Integration & Local Storage

When any game session ends, save the following JSON to localStorage under the key `lms_result`:

```json
{
  "userId": "string",
  "contentId": "module_01",
  "chapterId": "string",
  "score": 0,
  "maxScore": 100,
  "completion": true,
  "success": true,
  "duration": 0,
  "timestamp": "ISO8601"
}
```

### Fields

| Field       | Description                                                  |
|-------------|--------------------------------------------------------------|
| userId      | From LMS session or localStorage                             |
| contentId   | Module/game identifier e.g. `dragon_drop`, `shape_finder`, `rocket_rush` |
| chapterId   | Specific level or task ID                                    |
| score       | Points earned in the session                                 |
| maxScore    | Maximum possible score                                       |
| completion  | Whether the game was finished                                |
| success     | Whether the player passed                                    |
| duration    | Time spent in seconds                                        |
| timestamp   | ISO 8601 format, set at game end                             |

### LMS Sync

- Save result to localStorage key `lms_result` on every game end
- Also maintain a history array in localStorage key `lms_history` (append each result)
- Expose a global function `window.getLMSResult()` that returns the latest result JSON — LMS will call this to read progress
- When LMS API endpoint is available, POST the result JSON to it after saving to localStorage

---

## File Structure

```
src/
  components/       # React UI components
  scenes/           # Phaser game scenes
  utils/
    lmsStorage.ts   # All localStorage read/write logic lives here
  types/
    lms.ts          # TypeScript types for LMS result object
```

---

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Tailwind CSS for all styling — no inline styles, no separate CSS files
- Each Phaser scene is a class extending `Phaser.Scene`
