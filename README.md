# 🏆 FIFA World Cup 2026 – Full Fixture Viewer

Interactive viewer for all **104 matches** — Group Stage through the Final — in Bangladesh Time (BST, UTC+6).

## 🔴 [Live Site](https://chyfarhanjamil.github.io/test-wc2026-fixtures/)

## ✨ Features
- All 48 teams across Groups A–L (Group Stage)
- Full knockout bracket: Round of 32 → Round of 16 → QF → SF → 3rd Place → Final
- 5 view modes: By Team, By Group, By Time, Calendar, Knockout Bracket
- Search by team name
- .ics export for iPhone / Google Calendar
- All times in Bangladesh timezone (BST = UTC+6)
- Fully responsive — mobile & desktop

## 📁 Project Structure (Modular)

```
wc2026/
├── index.html          ← Thin shell, only HTML structure + script tags
├── css/
│   └── styles.css      ← All visual styles in one place
└── js/
    ├── data.js         ← Single source of truth: all 104 fixtures + helpers
    ├── teamGrid.js     ← Team card rendering & filtering
    ├── calendar.js     ← Monthly calendar view & day detail panel
    ├── bracket.js      ← Knockout stage bracket view
    ├── export.js       ← .ics calendar export modal
    └── app.js          ← App controller: state, mode switching, wiring
```

## 🗂️ Module Responsibilities

| File | What it does | What it does NOT do |
|------|-------------|---------------------|
| `data.js` | Stores all fixtures, converts UTC→BST, exports lookup maps | Touches the DOM |
| `teamGrid.js` | Builds & filters team cards | Knows about calendar or modes |
| `calendar.js` | Renders monthly calendar & day results | Knows about team cards |
| `bracket.js` | Renders knockout bracket | Knows about group stage |
| `export.js` | ICS file generation & download modal | Knows about rendering |
| `app.js` | Wires everything together, manages `currentMode` | Contains business logic |

## 🔄 Adding / Changing Data

To update fixtures (e.g. add confirmed knockout matchups):
1. Open `js/data.js`
2. Find the relevant entry in `FIXTURES_RAW` (e.g. the final placeholder)
3. Replace placeholder team names (`W101`, `W102`) with actual team names
4. Nothing else needs to change

To change a specific UI section (e.g. calendar):
- Edit only `js/calendar.js` — no other module is affected

To change styles:
- Edit only `css/styles.css`

## 📅 Tournament Schedule Key Dates

| Stage | Dates |
|-------|-------|
| Group Stage | Jun 11 – Jun 27 |
| Round of 32 | Jun 28 – Jul 3 |
| Round of 16 | Jul 4 – Jul 7 |
| Quarter-Finals | Jul 9 – Jul 11 |
| Semi-Finals | Jul 14 – Jul 15 |
| 3rd Place Match | Jul 18 |
| **Final** | **Jul 19** |

## 🛠️ Built With
- Pure HTML5 / CSS3 / Vanilla JavaScript (no frameworks, no build step)
- Hosted free on GitHub Pages

## 📄 License
MIT — free to use and share.
