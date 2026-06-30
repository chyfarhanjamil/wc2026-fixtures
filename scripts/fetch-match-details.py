"""
scripts/fetch-match-details.py

Fetches goal-by-goal detail (scorer names + minutes) for matches that
finished recently, so the site can show a "who scored" dropdown on
finished match cards.

Why a separate, rate-limited step:
  The free football-data.org tier allows 10 requests/min. The bulk
  /competitions/2000/matches endpoint (used for scores) does NOT include
  goal events — only the per-match /v4/matches/{id} endpoint does. We
  can't fetch all ~104 matches every run, so we only fetch matches that
  finished in the last 6 hours. Once a match is more than 6 hours old its
  detail file already exists on disk from a previous run and doesn't need
  refetching.
"""

import json
import subprocess
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

API_TOKEN = "72f45df7ce7b4991ac9ebd929bf4c53d"
DATA_DIR = Path("data")
DETAIL_DIR = DATA_DIR / "match-details"
DETAIL_DIR.mkdir(parents=True, exist_ok=True)

with open(DATA_DIR / "matches.json") as f:
    matches_data = json.load(f)

cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
targets = []

for m in matches_data.get("matches", []):
    if m.get("status") != "FINISHED":
        continue
    try:
        kicked = datetime.fromisoformat(m["utcDate"].replace("Z", "+00:00"))
    except Exception:
        continue
    if kicked < cutoff:
        continue
    targets.append(m["id"])

print(f"Fetching goal detail for {len(targets)} recently-finished match(es): {targets}")

# Hard cap per run so we always stay under the 10 req/min free-tier limit
# even if many matches finished in the same window (e.g. simultaneous KOs).
MAX_PER_RUN = 8

for mid in targets[:MAX_PER_RUN]:
    out_path = DETAIL_DIR / f"{mid}.json"
    result = subprocess.run(
        [
            "curl", "-s",
            "-H", f"X-Auth-Token: {API_TOKEN}",
            f"https://api.football-data.org/v4/matches/{mid}",
        ],
        capture_output=True, text=True,
    )
    try:
        payload = json.loads(result.stdout)
        # Only keep the fields we actually need to keep the repo small:
        # goals (scorer, minute, team, type) and bookings if present.
        trimmed = {
            "id": payload.get("id"),
            "utcDate": payload.get("utcDate"),
            "status": payload.get("status"),
            "homeTeam": (payload.get("homeTeam") or {}).get("name"),
            "awayTeam": (payload.get("awayTeam") or {}).get("name"),
            "goals": payload.get("goals", []),
            "bookings": payload.get("bookings", []),
        }
        with open(out_path, "w") as f:
            json.dump(trimmed, f, indent=None)
        print(f"  ✓ match {mid}: {len(trimmed['goals'])} goal event(s)")
    except Exception as e:
        print(f"  ✗ match {mid}: failed to parse ({e})")

    time.sleep(7)  # 10 req/min limit → ~6s min spacing; 7s for safety margin

# Build a single combined index file so the frontend only needs ONE fetch
# instead of one per match (avoids 104 separate HTTP requests in-browser).
index = {}
for f in DETAIL_DIR.glob("*.json"):
    try:
        with open(f) as fh:
            d = json.load(fh)
        index[str(d["id"])] = d
    except Exception:
        continue

with open(DATA_DIR / "match-details.json", "w") as f:
    json.dump(index, f, indent=None)

print(f"\n✓ Combined match-details.json written with {len(index)} matches total")
