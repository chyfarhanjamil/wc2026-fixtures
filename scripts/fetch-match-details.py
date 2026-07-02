"""
scripts/fetch-match-details.py

Fetches goal-by-goal detail (scorer names + minutes) for finished matches,
so the site can show a "who scored" dropdown on finished match cards.

Two sources, in this order:

  1. football-data.org /v4/matches/{id} — the account's original source.
     NOTE: on football-data.org's free/base tiers this endpoint's "goals"
     field comes back empty; per-match goal events require their paid
     "Deep Data" add-on. We still try it first (in case the account gets
     upgraded), for matches that finished in the last 6 hours, respecting
     the free tier's 10 req/min limit.

  2. openfootball/worldcup.json (raw.githubusercontent.com) — a free,
     public-domain, no-API-key dataset that includes real goal scorers
     with minutes for World Cup 2026. It's hand-curated once a day by a
     maintainer, so it can lag by up to ~24h and doesn't have Round of 32
     onward until they add it, but it fills in group-stage scorers (and
     any KO rounds they've captured) completely for free. We use it to
     fill in ONLY the matches where source #1 has nothing.

Either source can leave a match with no goal data (e.g. openfootball
hasn't caught up to a knockout round yet) — that's fine, the frontend
shows a "details coming soon" note for those until data source lands one.
"""

import json
import subprocess
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

API_TOKEN = "72f45df7ce7b4991ac9ebd929bf4c53d"
OPENFOOTBALL_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
DATA_DIR = Path("data")
DETAIL_DIR = DATA_DIR / "match-details"
DETAIL_DIR.mkdir(parents=True, exist_ok=True)

with open(DATA_DIR / "matches.json") as f:
    matches_data = json.load(f)

# ─────────────────────────────────────────────────────────────────────────
# SOURCE 1 — football-data.org per-match endpoint (original logic, as-is)
# ─────────────────────────────────────────────────────────────────────────

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

print(f"[football-data.org] Fetching goal detail for {len(targets)} recently-finished match(es): {targets}")

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
        trimmed = {
            "id": payload.get("id"),
            "utcDate": payload.get("utcDate"),
            "status": payload.get("status"),
            "homeTeam": (payload.get("homeTeam") or {}).get("name"),
            "awayTeam": (payload.get("awayTeam") or {}).get("name"),
            "goals": payload.get("goals", []),
            "bookings": payload.get("bookings", []),
            "source": "football-data.org",
        }
        with open(out_path, "w") as f:
            json.dump(trimmed, f, indent=None)
        print(f"  ✓ match {mid}: {len(trimmed['goals'])} goal event(s)")
    except Exception as e:
        print(f"  ✗ match {mid}: failed to parse ({e})")

    time.sleep(7)  # 10 req/min limit → ~6s min spacing; 7s for safety margin

# ─────────────────────────────────────────────────────────────────────────
# SOURCE 2 — openfootball/worldcup.json (free, no key, fills the gaps
# left by source 1 — which on free-tier football-data.org is *all* of
# them, since goal events need a paid add-on there)
# ─────────────────────────────────────────────────────────────────────────

# football-data.org's team names → our canonical names (mirrors the
# CANON_MAP in js/live.js so matching stays consistent with the frontend)
CANON_MAP = {
    "mexico": "Mexico", "south africa": "South Africa",
    "korea republic": "Korea Republic", "republic of korea": "Korea Republic", "south korea": "Korea Republic",
    "czechia": "Czechia", "czech republic": "Czechia",
    "canada": "Canada",
    "bosnia and herzegovina": "Bosnia & Herzegovina", "bosnia-herzegovina": "Bosnia & Herzegovina",
    "bosnia & herzegovina": "Bosnia & Herzegovina",
    "qatar": "Qatar", "switzerland": "Switzerland", "brazil": "Brazil", "morocco": "Morocco",
    "haiti": "Haiti", "scotland": "Scotland",
    "united states": "USA", "united states of america": "USA", "usa": "USA",
    "paraguay": "Paraguay", "australia": "Australia",
    "türkiye": "Türkiye", "turkiye": "Türkiye", "turkey": "Türkiye",
    "germany": "Germany", "curaçao": "Curaçao", "curacao": "Curaçao",
    "ivory coast": "Ivory Coast", "côte d'ivoire": "Ivory Coast", "cote d'ivoire": "Ivory Coast",
    "ecuador": "Ecuador", "netherlands": "Netherlands", "holland": "Netherlands", "japan": "Japan",
    "tunisia": "Tunisia", "sweden": "Sweden", "belgium": "Belgium", "egypt": "Egypt", "iran": "Iran",
    "new zealand": "New Zealand", "spain": "Spain",
    "cabo verde": "Cabo Verde", "cape verde": "Cabo Verde", "cape verde islands": "Cabo Verde",
    "saudi arabia": "Saudi Arabia", "uruguay": "Uruguay", "france": "France", "senegal": "Senegal",
    "iraq": "Iraq", "norway": "Norway", "argentina": "Argentina", "algeria": "Algeria", "austria": "Austria",
    "jordan": "Jordan", "portugal": "Portugal",
    "congo dr": "Congo DR", "dr congo": "Congo DR", "democratic republic of congo": "Congo DR",
    "democratic republic of the congo": "Congo DR", "dr. congo": "Congo DR",
    "uzbekistan": "Uzbekistan", "colombia": "Colombia", "england": "England", "croatia": "Croatia",
    "ghana": "Ghana", "panama": "Panama",
}

# our canonical name → openfootball's spelling, only where they differ
OPENFOOTBALL_NAME_MAP = {
    "Cabo Verde": "Cape Verde",
    "Congo DR": "DR Congo",
    "Czechia": "Czech Republic",
    "Korea Republic": "South Korea",
    "Türkiye": "Turkey",
}


def canon(name):
    return CANON_MAP.get((name or "").lower().strip(), name)


def openfootball_name(name):
    c = canon(name)
    return OPENFOOTBALL_NAME_MAP.get(c, c)


def _minute_to_int(raw):
    # openfootball gives stoppage time as "90+6" — take the base minute
    # for sorting/display; football-data.org's own field is already int.
    if raw is None:
        return None
    try:
        return int(str(raw).split("+")[0])
    except (ValueError, TypeError):
        return None


print(f"\n[openfootball] Fetching {OPENFOOTBALL_URL}")
of_lookup = {}
try:
    with urllib.request.urlopen(OPENFOOTBALL_URL, timeout=20) as resp:
        of_data = json.loads(resp.read().decode("utf-8"))
    for m in of_data.get("matches", []):
        if not m.get("goals1") and not m.get("goals2"):
            continue  # no goal data recorded for this match yet
        key = frozenset([m["team1"], m["team2"]])
        of_lookup[key] = m
    print(f"  ✓ loaded {len(of_lookup)} match(es) with goal data")
except Exception as e:
    print(f"  ✗ could not fetch openfootball data ({e}) — skipping this source")
    of_lookup = {}

enriched = 0
still_missing = []

for m in matches_data.get("matches", []):
    if m.get("status") != "FINISHED":
        continue
    mid = m["id"]
    out_path = DETAIL_DIR / f"{mid}.json"

    # Don't touch a match that already has real goal data (from source 1,
    # or from a previous openfootball run that already found this match).
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text())
            if existing.get("goals"):
                continue
        except Exception:
            pass

    home_name = m["homeTeam"]["name"]
    away_name = m["awayTeam"]["name"]
    key = frozenset([openfootball_name(home_name), openfootball_name(away_name)])
    of_match = of_lookup.get(key)
    if not of_match:
        still_missing.append(mid)
        continue

    home_is_team1 = openfootball_name(home_name) == of_match["team1"]
    goals = []
    for side_key, team_name in (("goals1", home_name), ("goals2", away_name)) if home_is_team1 \
            else (("goals1", away_name), ("goals2", home_name)):
        for g in of_match.get(side_key, []):
            gtype = "PENALTY" if g.get("penalty") else ("OWN_GOAL" if g.get("owngoal") else "REGULAR")
            goals.append({
                "scorer": {"name": g.get("name", "Unknown")},
                "team": {"name": team_name},
                "minute": _minute_to_int(g.get("minute")),
                "type": gtype,
            })

    trimmed = {
        "id": mid,
        "utcDate": m["utcDate"],
        "status": "FINISHED",
        "homeTeam": home_name,
        "awayTeam": away_name,
        "goals": goals,
        "bookings": [],  # openfootball doesn't carry card data
        "source": "openfootball",
    }
    with open(out_path, "w") as f:
        json.dump(trimmed, f, indent=None)
    enriched += 1
    print(f"  ✓ match {mid} ({home_name} vs {away_name}): {len(goals)} goal event(s) from openfootball")

print(f"\n[openfootball] enriched {enriched} match(es); "
      f"{len(still_missing)} finished match(es) still have no goal data from either source "
      f"(likely too new for openfootball's daily update): {still_missing}")

# ─────────────────────────────────────────────────────────────────────────
# Build a single combined index file so the frontend only needs ONE fetch
# instead of one per match (avoids 104 separate HTTP requests in-browser).
# ─────────────────────────────────────────────────────────────────────────
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

print(f"\n✓ Combined match-details.json written with {len(index)} matches total "
      f"({sum(1 for d in index.values() if d.get('goals'))} with goal data)")
