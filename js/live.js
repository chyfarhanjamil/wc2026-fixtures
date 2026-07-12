/**
 * live.js — scores from /data/matches.json + /data/today.json
 *
 * THREE layers work together so the live icon and scores appear
 * as fast as possible:
 *
 * Layer 1 — PHANTOM LIVE (instant, zero delay)
 *   The browser knows every match kick-off time from data.js.
 *   If the current UTC clock says a match should be in progress
 *   (kick-off ≤ now < kick-off + 115 min), we immediately show
 *   a 🔴 LIVE badge with a computed elapsed minute — no server
 *   call needed.  This fires exactly at kick-off time.
 *
 * Layer 2 — TODAY.JSON (faster refresh, ~1-3 min behind)
 *   /data/today.json is fetched from the GitHub repo. It only
 *   contains today's matches so it's tiny and GitHub Pages CDN
 *   serves it faster. Polled every 60 seconds during match hours.
 *
 * Layer 3 — MATCHES.JSON (authoritative, 1-5 min behind)
 *   Full competition data. Polled every 2 min normally, every
 *   60 s during a live match window.
 *
 * Why GitHub Actions still delays:
 *   GitHub's free-tier cron scheduler queues jobs and during
 *   peak load (World Cup match times) can delay them 5-15 min.
 *   Layer 1 compensates for this — the UI shows "LIVE" immediately
 *   at kick-off and Layer 2/3 fill in the actual score as soon as
 *   GitHub's worker runs.
 */
"use strict";

const Live = (() => {
  // ── CONFIG ────────────────────────────────────────────────────────────
  const POLL_NORMAL_MS = 120000; // 2 min off-peak
  const POLL_LIVE_MS = 60000; // 1 min during match window
  const MATCH_DURATION = 115; // minutes: 90 + HT + stoppage buffer
  const CACHE_KEY_M = "wc2026_v7_matches";
  const CACHE_KEY_S = "wc2026_v7_scorers";

  // ── STATE ─────────────────────────────────────────────────────────────
  let liveData = {}; // fixtureId → payload
  let topScorers = [];
  let listeners = [];
  let _pollTimer = null;
  let _tickTimer = null; // 1-second tick for minute counter

  // ── CACHE ─────────────────────────────────────────────────────────────
  function _saveCache() {
    try {
      localStorage.setItem(CACHE_KEY_M, JSON.stringify(liveData));
      localStorage.setItem(CACHE_KEY_S, JSON.stringify(topScorers));
    } catch (e) {}
  }

  function _loadCache() {
    try {
      const m = localStorage.getItem(CACHE_KEY_M);
      const s = localStorage.getItem(CACHE_KEY_S);
      if (m) liveData = JSON.parse(m);
      if (s) topScorers = JSON.parse(s);
      return Object.keys(liveData).length > 0;
    } catch (e) {
      return false;
    }
  }

  // ── UTC INDEX ─────────────────────────────────────────────────────────
  let _utcIndex = null;

  function _buildUtcIndex() {
    _utcIndex = new Map();
    WC2026.FIXTURES.forEach((f) => {
      if (!f.utc) return;
      const key = f.utc.slice(0, 16);
      if (!_utcIndex.has(key)) _utcIndex.set(key, []);
      _utcIndex.get(key).push(f);
    });
  }

  // ── PHANTOM LIVE ──────────────────────────────────────────────────────
  // Returns true if any fixture is currently in its expected live window
  // based purely on system clock — no server data needed.
  function _phantomLiveFixtures() {
    const nowMs = Date.now();
    return WC2026.FIXTURES.filter((f) => {
      if (!f.utc) return false;
      const kickoff = new Date(f.utc).getTime();
      const end = kickoff + MATCH_DURATION * 60000;
      return nowMs >= kickoff && nowMs < end;
    });
  }

  // Compute elapsed minutes from kick-off (accounting for HT break)
  function _computeMinute(utc) {
    const elapsed = Math.floor((Date.now() - new Date(utc).getTime()) / 60000);
    if (elapsed <= 45) return elapsed;
    if (elapsed <= 60) return 45; // in HT break → show 45
    const secondHalf = elapsed - 60;
    return Math.min(45 + secondHalf, 90);
  }

  // Inject phantom data for fixtures that should be live right now
  // but haven't been confirmed by the API yet (or API is delayed).
  function _applyPhantomLive() {
    const phantoms = _phantomLiveFixtures();
    let changed = false;
    phantoms.forEach((f) => {
      const existing = liveData[`local_${f.id}`];
      // Only inject phantom if we have no real data yet, OR if the real
      // data still says TIMED/SCHEDULED (GitHub Actions hasn't run yet)
      if (
        !existing ||
        existing.status === "TIMED" ||
        existing.status === "SCHEDULED"
      ) {
        liveData[`local_${f.id}`] = {
          status: "IN_PLAY",
          scoreHome: existing?.scoreHome ?? null, // keep score if we have it
          scoreAway: existing?.scoreAway ?? null,
          htHome: existing?.htHome ?? null,
          htAway: existing?.htAway ?? null,
          minute: _computeMinute(f.utc),
          phantom: true, // flag so we know this isn't from the API
          scorers: existing?.scorers || [],
        };
        changed = true;
      } else if (existing && existing.phantom) {
        // Update computed minute on existing phantom
        existing.minute = _computeMinute(f.utc);
        changed = true;
      }
    });

    // Also clear phantom entries for matches that have now ended
    // (past the MATCH_DURATION window) but API hasn't confirmed FT yet
    Object.keys(liveData).forEach((key) => {
      const d = liveData[key];
      if (!d.phantom) return;
      const id = parseInt(key.replace("local_", ""));
      const f = WC2026.FIXTURES.find((x) => x.id === id);
      if (!f) return;
      const elapsed = (Date.now() - new Date(f.utc).getTime()) / 60000;
      if (elapsed > MATCH_DURATION) {
        // Past the expected end — remove phantom so it doesn't show stale LIVE badge
        delete liveData[key];
        changed = true;
      }
    });

    return changed;
  }

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    _buildUtcIndex();
    // Clear stale cache from previous versions
    [
      "wc2026_v1_matches",
      "wc2026_v1_scorers",
      "wc2026_v2_matches",
      "wc2026_v2_scorers",
      "wc2026_v3_matches",
      "wc2026_v3_scorers",
      "wc2026_v4_matches",
      "wc2026_v4_scorers",
      "wc2026_v5_matches",
      "wc2026_v5_scorers",
      "wc2026_v6_matches",
      "wc2026_v6_scorers",
    ].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

    // Layer 1: show cached results instantly
    const hadCache = _loadCache();
    if (hadCache) _notify();

    // Layer 1: phantom live — if a match is on right now, show LIVE immediately
    if (_applyPhantomLive()) _notify();

    // Start 1-second tick to keep computed minute counter moving
    _startTick();

    // Layer 2 & 3: fetch fresh data
    _setBanner("loading");
    fetchAll()
      .then(() => {
        _updateBanner();
        _scheduleNextPoll();
      })
      .catch((err) => {
        console.error("[Live] fetch failed:", err);
        _setBanner(hadCache ? "cached_error" : "error", err.message);
        _scheduleNextPoll();
      });
  }

  // ── TICK (1-second interval for live minute counter) ───────────────────
  function _startTick() {
    if (_tickTimer) return;
    _tickTimer = setInterval(() => {
      // Update phantom minutes and re-notify if anything is live
      const changed = _applyPhantomLive();
      if (changed) _notify();
    }, 15000); // every 15 seconds is smooth enough for a minute counter
  }

  // ── SMART POLLING ─────────────────────────────────────────────────────
  function _scheduleNextPoll() {
    if (_pollTimer) clearTimeout(_pollTimer);
    const phantoms = _phantomLiveFixtures();
    const hasLive =
      phantoms.length > 0 ||
      Object.values(liveData).some(
        (d) => d.status === "IN_PLAY" || d.status === "PAUSED",
      );
    const delay = hasLive ? POLL_LIVE_MS : POLL_NORMAL_MS;

    _pollTimer = setTimeout(() => {
      _setBanner("loading");
      fetchAll()
        .then(() => {
          _updateBanner();
          _scheduleNextPoll();
        })
        .catch((err) => {
          _setBanner("cached_error", err.message);
          _scheduleNextPoll();
        });
    }, delay);
  }

  // ── FETCH ─────────────────────────────────────────────────────────────
  async function fetchAll() {
    const t = Date.now();

    // Fetch today.json first (fast, small file — just today's matches)
    // then fall back to full matches.json. match-details.json carries
    // goal-scorer events for recently-finished matches (see scripts/
    // fetch-match-details.py) so the UI can show a "who scored" dropdown.
    const [todayRes, matchRes, scorerRes, detailRes] = await Promise.allSettled(
      [
        fetch(`data/today.json?t=${t}`).then((r) => {
          if (!r.ok) throw new Error(`today ${r.status}`);
          return r.json();
        }),
        fetch(`data/matches.json?t=${t}`).then((r) => {
          if (!r.ok) throw new Error(`matches ${r.status}`);
          return r.json();
        }),
        fetch(`data/scorers.json?t=${t}`).then((r) => {
          if (!r.ok) throw new Error(`scorers ${r.status}`);
          return r.json();
        }),
        fetch(`data/match-details.json?t=${t}`).then((r) => {
          if (!r.ok) throw new Error(`details ${r.status}`);
          return r.json();
        }),
      ],
    );

    if (
      matchRes.status === "rejected" &&
      scorerRes.status === "rejected" &&
      todayRes.status === "rejected"
    )
      throw new Error("JSON files not found — has the GitHub Action run yet?");

    // Ingest full matches first, then today's data on top (today is more up-to-date)
    if (matchRes.status === "fulfilled")
      _ingestMatches(matchRes.value.matches || []);
    if (todayRes.status === "fulfilled")
      _ingestMatches(todayRes.value.matches || []);
    if (scorerRes.status === "fulfilled")
      _ingestScorers(scorerRes.value.scorers || []);
    if (detailRes.status === "fulfilled")
      _ingestMatchDetails(detailRes.value || {});

    // Apply phantom live on top of whatever we got
    _applyPhantomLive();

    _saveCache();
    _notify();
  }

  // ── CANON MAP ─────────────────────────────────────────────────────────
  const CANON_MAP = {
    mexico: "Mexico",
    "south africa": "South Africa",
    "korea republic": "Korea Republic",
    "republic of korea": "Korea Republic",
    "south korea": "Korea Republic",
    czechia: "Czechia",
    "czech republic": "Czechia",
    canada: "Canada",
    "bosnia and herzegovina": "Bosnia & Herzegovina",
    "bosnia-herzegovina": "Bosnia & Herzegovina",
    "bosnia & herzegovina": "Bosnia & Herzegovina",
    qatar: "Qatar",
    switzerland: "Switzerland",
    brazil: "Brazil",
    morocco: "Morocco",
    haiti: "Haiti",
    scotland: "Scotland",
    "united states": "USA",
    "united states of america": "USA",
    usa: "USA",
    paraguay: "Paraguay",
    australia: "Australia",
    türkiye: "Türkiye",
    turkiye: "Türkiye",
    turkey: "Türkiye",
    germany: "Germany",
    curaçao: "Curaçao",
    curacao: "Curaçao",
    "ivory coast": "Ivory Coast",
    "côte d'ivoire": "Ivory Coast",
    "cote d'ivoire": "Ivory Coast",
    ecuador: "Ecuador",
    netherlands: "Netherlands",
    holland: "Netherlands",
    japan: "Japan",
    tunisia: "Tunisia",
    sweden: "Sweden",
    belgium: "Belgium",
    egypt: "Egypt",
    iran: "Iran",
    "new zealand": "New Zealand",
    spain: "Spain",
    "cabo verde": "Cabo Verde",
    "cape verde": "Cabo Verde",
    "cape verde islands": "Cabo Verde",
    "saudi arabia": "Saudi Arabia",
    uruguay: "Uruguay",
    france: "France",
    senegal: "Senegal",
    iraq: "Iraq",
    norway: "Norway",
    argentina: "Argentina",
    algeria: "Algeria",
    austria: "Austria",
    jordan: "Jordan",
    portugal: "Portugal",
    "congo dr": "Congo DR",
    "dr congo": "Congo DR",
    "democratic republic of congo": "Congo DR",
    "democratic republic of the congo": "Congo DR",
    uzbekistan: "Uzbekistan",
    colombia: "Colombia",
    england: "England",
    croatia: "Croatia",
    ghana: "Ghana",
    panama: "Panama",
    "cape verde islands": "Cabo Verde",
    "dr. congo": "Congo DR",
    "congo, dr": "Congo DR",
  };

  function _canon(name) {
    if (!name) return "";
    const key = name.toLowerCase().trim();
    if (CANON_MAP[key]) return CANON_MAP[key];
    const stripped = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (CANON_MAP[stripped]) return CANON_MAP[stripped];
    for (const [k, v] of Object.entries(CANON_MAP))
      if (k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === stripped)
        return v;
    return name.trim();
  }

  // ── INGEST MATCHES ────────────────────────────────────────────────────
  function _ingestMatches(matches) {
    if (!_utcIndex) _buildUtcIndex();

    matches.forEach((m) => {
      const home = (m.homeTeam || {}).name || "";
      const away = (m.awayTeam || {}).name || "";

      // CRITICAL: If API has no team names for this entry (KO match not yet
      // determined), skip it entirely. Never store a null-team entry because
      // it can corrupt the display of other matches via UTC collision.
      if (!home && !away) return;

      const ft = m.score?.fullTime || {};
      const rt = m.score?.regularTime || {}; // unambiguous 90-min score
      const ht = m.score?.halfTime || {};
      const et = m.score?.extraTime || {};
      const pen = m.score?.penalties || {};
      const winnerField = m.score?.winner || null; // 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW'
      const durationField = m.score?.duration || "REGULAR"; // 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'

      // CRITICAL: when a match goes past 90 minutes, different football-data.org
      // feed versions have been observed putting slightly different numbers in
      // `fullTime` (some include it as the 120-min score, others as something
      // else entirely depending on provider sync timing). `regularTime` is the
      // one unambiguous 90-minute score per the API schema, so whenever the
      // match was decided after regulation (EXTRA_TIME or PENALTY_SHOOTOUT),
      // we prefer regularTime for the HEADLINE score and treat extraTime as
      // the explicit 120-min line if present. This guarantees the main score
      // shown always matches what actually happened in the 90 minutes, with
      // AET/penalties shown as clearly separate lines beneath it.
      const decidedAfterRegulation =
        durationField === "EXTRA_TIME" || durationField === "PENALTY_SHOOTOUT";
      const mainScoreSource =
        decidedAfterRegulation && rt.home !== undefined && rt.home !== null
          ? rt
          : ft;
      const hc = _canon(home);
      const ac = _canon(away);
      const utcKey = (m.utcDate || "").slice(0, 16);
      const apiStage = m.stage || "";
      const isApiGroup = apiStage === "GROUP_STAGE";

      function _makePayload(fixtureHome) {
        // For KO fixtures, fixtureHome is a placeholder like '2nd Group A'
        // which never matches the API team name like 'South Africa'.
        // The API home/away order is authoritative for KO; never reverse it.
        // For group stage: check canon name match as before.
        const isKOFixture =
          !fixtureHome ||
          fixtureHome.includes("Group") ||
          fixtureHome.includes("Winner") ||
          fixtureHome.includes("Best") ||
          fixtureHome.includes("Loser") ||
          fixtureHome.includes("Match");
        const reversed = isKOFixture
          ? false
          : fixtureHome && _canon(fixtureHome) !== hc;

        const status = m.status || "TIMED";
        let minute = null;
        if ((status === "IN_PLAY" || status === "PAUSED") && m.utcDate) {
          minute = _computeMinute(m.utcDate);
        }

        // Decisive winner: prefer the API's explicit winner field (this is
        // correct even when fullTime/extraTime end level and the match was
        // decided on penalties). Map HOME_TEAM/AWAY_TEAM to our home/away
        // orientation, accounting for the reversed flag.
        let winnerSide = null; // 'home' | 'away' | null
        if (winnerField === "HOME_TEAM")
          winnerSide = reversed ? "away" : "home";
        else if (winnerField === "AWAY_TEAM")
          winnerSide = reversed ? "home" : "away";
        // DRAW (group stage) or null (not finished) → winnerSide stays null

        // Main headline score: 90-minute score whenever the match needed
        // extra time or penalties (see mainScoreSource selection above);
        // otherwise the normal fullTime score for matches decided in 90.
        const mainHome = mainScoreSource.home ?? null;
        const mainAway = mainScoreSource.away ?? null;

        // 120-minute (after extra time) score — only meaningfully different
        // from the 90-min score when extra time was actually played AND the
        // API gives us a distinct extraTime entry. If extraTime is absent or
        // identical to fullTime, we don't show a redundant AET line for it
        // (the penalties line alone already tells the full story).
        const etRawHome = et.home ?? null;
        const etRawAway = et.away ?? null;
        const hasDistinctET =
          etRawHome !== null &&
          etRawAway !== null &&
          !(etRawHome === mainHome && etRawAway === mainAway);

        return {
          status,
          scoreHome: reversed ? mainAway : mainHome,
          scoreAway: reversed ? mainHome : mainAway,
          htHome: reversed ? (ht.away ?? null) : (ht.home ?? null),
          htAway: reversed ? (ht.home ?? null) : (ht.away ?? null),
          // Extra-time (120-min) score — only populated when distinct from
          // the 90-min score; null otherwise so the UI doesn't show a
          // duplicate/confusing AET line for a normal-time result.
          etHome: hasDistinctET ? (reversed ? etRawAway : etRawHome) : null,
          etAway: hasDistinctET ? (reversed ? etRawHome : etRawAway) : null,
          // Penalty shootout score (only present if decided on penalties)
          penHome:
            (pen.home ?? null) !== null
              ? reversed
                ? (pen.away ?? null)
                : (pen.home ?? null)
              : null,
          penAway:
            (pen.away ?? null) !== null
              ? reversed
                ? (pen.home ?? null)
                : (pen.away ?? null)
              : null,
          duration: durationField, // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
          winnerSide, // 'home' | 'away' | null — decisive winner incl. penalties
          minute,
          phantom: false,
          scorers: [],
        };
      }

      // ── Route 1: Match by UTC kick-off time ───────────────────────────
      const timeMatches = _utcIndex.get(utcKey) || [];

      if (timeMatches.length === 1) {
        const f = timeMatches[0];
        // SAFETY: don't store a group-stage API result into a KO fixture slot
        if (isApiGroup && f.isKO) return;
        const p = _makePayload(f.home);
        if (p) liveData[`local_${f.id}`] = p;
        return;
      }

      if (timeMatches.length > 1) {
        // Simultaneous matches — break tie by team name
        const hit = timeMatches.find(
          (f) =>
            (_canon(f.home) === hc && _canon(f.away) === ac) ||
            (_canon(f.home) === ac && _canon(f.away) === hc),
        );
        if (hit) {
          if (isApiGroup && hit.isKO) return;
          const p = _makePayload(hit.home);
          if (p) liveData[`local_${hit.id}`] = p;
          return;
        }
        // UTC matched but team names don't match any fixture — skip to Route 2
      }

      // ── Route 2: Team-name fallback ───────────────────────────────────
      // ONLY for group-stage API matches → ONLY match against group-stage fixtures.
      // This prevents a group result from being stored against a KO fixture ID.
      if (!isApiGroup) return;

      WC2026.FIXTURES.forEach((f) => {
        if (f.stage !== "group") return;
        if (
          (_canon(f.home) === hc && _canon(f.away) === ac) ||
          (_canon(f.home) === ac && _canon(f.away) === hc)
        ) {
          const p = _makePayload(f.home);
          if (p) liveData[`local_${f.id}`] = p;
        }
      });
    });
  }

  // ── INGEST SCORERS ────────────────────────────────────────────────────
  function _ingestScorers(scorers) {
    topScorers = scorers.map((s) => ({
      name: s.player?.name || "?",
      nationality: s.player?.nationality || "",
      teamRaw: s.team?.name || "",
      goals: s.goals || 0,
      assists: s.assists || 0,
      penalties: s.penalties || 0,
      playedMatches: s.playedMatches || 0,
    }));
  }

  // ── INGEST MATCH DETAILS (goal scorers, bookings) ───────────────────────
  // matchDetails keyed by football-data.org match id (string) → trimmed
  // payload written by scripts/fetch-match-details.py. We map each entry
  // onto our own fixture ids via UTC time + team-name matching, same
  // approach as _ingestMatches, then attach the scorer list to liveData
  // so scorersHtml()/getScorers() can render them.
  function _ingestMatchDetails(detailsByApiId) {
    if (!_utcIndex) _buildUtcIndex();

    Object.values(detailsByApiId).forEach((d) => {
      const home = d.homeTeam || "";
      const away = d.awayTeam || "";
      if (!home && !away) return;

      const hc = _canon(home);
      const ac = _canon(away);
      const utcKey = (d.utcDate || "").slice(0, 16);
      const timeMatches = _utcIndex.get(utcKey) || [];

      let targetFixture = null;
      if (timeMatches.length === 1) {
        targetFixture = timeMatches[0];
      } else if (timeMatches.length > 1) {
        targetFixture =
          timeMatches.find(
            (f) =>
              (_canon(f.home) === hc && _canon(f.away) === ac) ||
              (_canon(f.home) === ac && _canon(f.away) === hc),
          ) || null;
      }
      if (!targetFixture) return;

      const key = `local_${targetFixture.id}`;
      const existing = liveData[key];
      if (!existing) return; // no score data yet for this fixture — skip scorers too

      // Determine if API's home/away needs flipping to match our fixture's
      // home/away orientation (mirrors the logic in _ingestMatches).
      //
      // CRITICAL: for KO fixtures, targetFixture.home is a placeholder like
      // "2nd Group A" or "Winner R32 Match 73" — it will NEVER canon-match
      // a real team name, so comparing it directly would always evaluate
      // as "reversed" and flip every single goal to the wrong side (this
      // was a real bug: e.g. France's own goals were showing up under
      // Sweden). For KO fixtures we instead trust the API's home/away
      // order as-is, exactly like _ingestMatches already does.
      const isKOFixture =
        !targetFixture.home ||
        targetFixture.home.includes("Group") ||
        targetFixture.home.includes("Winner") ||
        targetFixture.home.includes("Best") ||
        targetFixture.home.includes("Loser") ||
        targetFixture.home.includes("Match");
      const reversed = isKOFixture
        ? false
        : _canon(targetFixture.home) !== hc;

      const scorers = (d.goals || [])
        .map((g) => {
          const scoredForHome = g.team?.name && _canon(g.team.name) === hc;
          const isHomeSide = reversed ? !scoredForHome : scoredForHome;
          return {
            player: g.scorer?.name || g.player?.name || "Unknown",
            minute: g.minute ?? null,
            type: g.type || "REGULAR", // REGULAR | OWN_GOAL | PENALTY
            side: isHomeSide ? "home" : "away",
            team: g.team?.name || "",
          };
        })
        .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

      const bookings = (d.bookings || [])
        .map((b) => {
          const bookedForHome = b.team?.name && _canon(b.team.name) === hc;
          const isHomeSide = reversed ? !bookedForHome : bookedForHome;
          return {
            player: b.player?.name || "Unknown",
            minute: b.minute ?? null,
            card: b.card || "YELLOW_CARD",
            side: isHomeSide ? "home" : "away",
          };
        })
        .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

      liveData[key] = { ...existing, scorers, bookings };
    });
  }

  // ── NOTIFY ────────────────────────────────────────────────────────────
  function _notify() {
    listeners.forEach((fn) => {
      try {
        fn(liveData);
      } catch (e) {}
    });
  }

  // ── BANNER ────────────────────────────────────────────────────────────
  function _updateBanner() {
    const hasLiveMatch = Object.values(liveData).some(
      (d) => d.status === "IN_PLAY" || d.status === "PAUSED",
    );
    if (hasLiveMatch) _setBanner("live");
    else if (Object.keys(liveData).length > 0) _setBanner("waiting");
    else _setBanner("waiting");
  }

  function _setBanner(type, detail) {
    const el = document.getElementById("liveBanner");
    if (!el) return;
    const msgs = {
      loading: "⏳ Fetching latest scores…",
      cached_error: "⚠️ Could not refresh — showing last saved results.",
      waiting:
        "📅 Live scores will appear automatically when matches kick off.",
      live: "🟢 Match in progress — scores update every 60 seconds.",
      error: "⚠️ Score files not ready yet — please refresh in a moment.",
    };
    if (el._hideTimer) {
      clearTimeout(el._hideTimer);
      el._hideTimer = null;
    }
    el.className = `live-banner live-banner--${type}`;
    el.style.opacity = "1";
    el.style.transition = "";
    el.innerHTML = `<span>${msgs[type] || ""}${
      detail
        ? ` <code style="opacity:.7;font-size:11px">(${detail})</code>`
        : ""
    }</span>`;
    el.style.display = "block";

    const hideDelay =
      type === "loading"
        ? null
        : ["error", "cached_error"].includes(type)
          ? 12000
          : 5000;
    if (hideDelay !== null) {
      el._hideTimer = setTimeout(() => {
        el.style.transition = "opacity 0.6s ease";
        el.style.opacity = "0";
        setTimeout(() => {
          el.style.display = "none";
          el.style.opacity = "1";
        }, 650);
      }, hideDelay);
    }
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────
  function onUpdate(fn) {
    listeners.push(fn);
  }
  function forFixture(f) {
    return liveData[`local_${f.id}`] || null;
  }

  function scoreLabel(f) {
    const d = forFixture(f);
    if (!d || d.scoreHome === null || d.scoreAway === null) return null;
    return `${d.scoreHome}–${d.scoreAway}`;
  }

  // Full score breakdown for KO matches that went past 90 minutes.
  // Returns null for normal-time results, otherwise an object describing
  // what to render: the regulation score plus an extra-time and/or
  // penalties line. Used by calendar.js / bracket.js / teamGrid.js to show
  // "2-2 (AET) — Pens 5-4" instead of just the final number.
  function scoreBreakdown(f) {
    const d = forFixture(f);
    if (!d || d.scoreHome === null || d.scoreAway === null) return null;
    if (d.duration === "REGULAR") return null; // nothing extra to show

    return {
      duration: d.duration, // 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
      regHome: d.scoreHome, // score shown is already fullTime
      regAway: d.scoreAway,
      etHome: d.etHome,
      etAway: d.etAway,
      penHome: d.penHome,
      penAway: d.penAway,
      winnerSide: d.winnerSide,
    };
  }

  // Which side won outright — reads the API's authoritative winner field so
  // penalty-shootout results resolve correctly even when fullTime is level.
  function winnerSide(f) {
    const d = forFixture(f);
    if (!d) return null;
    if (d.status !== "FINISHED") return null;
    return d.winnerSide; // 'home' | 'away' | null (null only for group-stage draws)
  }

  function statusBadge(f) {
    const d = forFixture(f);
    if (!d) return "";
    if (d.status === "IN_PLAY") {
      const minStr = d.minute ? ` ${d.minute}'` : "";
      const phantomNote = d.phantom
        ? ' <span style="font-size:9px;opacity:.7">(approx)</span>'
        : "";
      return `<span class="badge badge--live">🔴 LIVE${minStr}</span>${phantomNote}`;
    }
    if (d.status === "PAUSED")
      return `<span class="badge badge--ht">⏸ HT</span>`;
    if (d.status === "FINISHED")
      return `<span class="badge badge--ft">FT</span>`;
    return "";
  }

  function scorersHtml(f) {
    const d = forFixture(f);
    if (!d || !d.scorers?.length) return "";
    return `<div class="scorers-row">${d.scorers
      .map((g) => {
        const ico =
          g.type === "OWN_GOAL"
            ? "⚽(OG)"
            : g.type === "PENALTY"
              ? "⚽(P)"
              : "⚽";
        return `<span class="scorer-item">${ico} ${g.player} <b>${g.minute}'</b></span>`;
      })
      .join('<span class="scorer-sep"> · </span>')}</div>`;
  }

  // Raw scorer list for a fixture, split by side, for building a custom
  // "who scored" dropdown. Returns null if no goal-event data is available
  // yet for this match (e.g. it finished more than ~6 hours ago and the
  // detail-fetch window already passed, or goal data hasn't synced yet).
  function getScorers(f) {
    const d = forFixture(f);
    if (!d) return null;
    return {
      home: (d.scorers || []).filter((g) => g.side === "home"),
      away: (d.scorers || []).filter((g) => g.side === "away"),
      bookings: {
        home: (d.bookings || []).filter((b) => b.side === "home"),
        away: (d.bookings || []).filter((b) => b.side === "away"),
      },
      hasDetail:
        !!(d.scorers && d.scorers.length) ||
        !!(d.bookings && d.bookings.length),
    };
  }

  function getTopScorers() {
    return topScorers;
  }

  // ── SHARED UI BUILDERS ───────────────────────────────────────────────
  // These build ready-made HTML fragments so calendar.js, bracket.js and
  // teamGrid.js render scores/scorer-dropdowns identically, with the same
  // markup and CSS classes, instead of three slightly different versions.

  // Score label including penalty/extra-time breakdown when applicable.
  // Normal match:        "2–1"
  // Decided after ET:    "2–2" with a small "(AET)" tag handled by caller
  // Decided on penalties: main label stays the regulation/ET score, plus
  //                       a separate "Pens 5–4" line is returned too.
  function scoreLabelDetailed(f) {
    const main = scoreLabel(f);
    if (!main) return null;
    const bd = scoreBreakdown(f);
    if (!bd) return { main, sub: null };

    // Build an optional "AET 2-2" line when extra time produced a score
    // distinct from the 90-minute score (e.g. someone scored in ET before
    // it went to penalties, or the match was won outright in ET).
    const etLine =
      bd.etHome !== null && bd.etAway !== null
        ? `AET ${bd.etHome}–${bd.etAway}`
        : null;

    if (
      bd.duration === "PENALTY_SHOOTOUT" &&
      bd.penHome !== null &&
      bd.penAway !== null
    ) {
      return {
        main,
        sub: etLine
          ? `${etLine} · Pens ${bd.penHome}–${bd.penAway}`
          : `Pens ${bd.penHome}–${bd.penAway}`,
        tag: "AET",
      };
    }
    if (bd.duration === "EXTRA_TIME") {
      return {
        main: etLine ? `${bd.etHome}–${bd.etAway}` : main,
        sub: null,
        tag: "AET",
      };
    }
    return { main, sub: null };
  }

  // Builds the score/vs HTML block used inside a match card, including the
  // (AET) tag and Pens line when the match needed extra time or penalties.
  function scoreBlockHtml(f, vsLabel) {
    const detail = scoreLabelDetailed(f);
    if (!detail) {
      const ld = forFixture(f);
      if (ld && (ld.status === "IN_PLAY" || ld.status === "PAUSED")) {
        // The match has kicked off but our data source hasn't reported a
        // live score yet (the free tier updates scores with a delay, not
        // instantly) — make that clear instead of showing the same "vs"
        // a match that hasn't even started yet would show.
        const note = typeof I18n !== "undefined" ? I18n.t("score_pending_live") : "Score updating…";
        return `<span class="score-block">
          <span class="match-score score--pending-live">–</span>
          <span class="score-pens">${note}</span>
        </span>`;
      }
      return `<span class="match-sep">${vsLabel || "vs"}</span>`;
    }

    const ld = forFixture(f);
    const liveCls = ld && ld.status === "IN_PLAY" ? "score--live" : "";
    const tagHtml = detail.tag
      ? `<span class="score-tag">${detail.tag}</span>`
      : "";
    const subHtml = detail.sub
      ? `<span class="score-pens">${detail.sub}</span>`
      : "";

    return `<span class="score-block">
      <span class="match-score ${liveCls}">${detail.main}</span>${tagHtml}
      ${subHtml}
    </span>`;
  }

  // Shared row builders used by both the collapsible scorer dropdown and
  // the always-open featured match card.
  function _goalRowHtml(g) {
    const ico =
      g.type === "OWN_GOAL"
        ? "⚽<span class=\"scorer-dd-tag\">OG</span>"
        : g.type === "PENALTY"
          ? "⚽<span class=\"scorer-dd-tag\">P</span>"
          : "⚽";
    return `<div class="scorer-dd-row">
      <span class="scorer-dd-icon">${ico}</span>
      <span class="scorer-dd-name">${g.player}</span>
      <span class="scorer-dd-min">${g.minute != null ? g.minute + "'" : ""}</span>
    </div>`;
  }
  function _cardRowHtml(b) {
    const ico = b.card === "RED_CARD" || b.card === "RED" ? "🟥" : "🟨";
    return `<div class="scorer-dd-row scorer-dd-row--card">
      <span class="scorer-dd-icon">${ico}</span>
      <span class="scorer-dd-name">${b.player}</span>
      <span class="scorer-dd-min">${b.minute != null ? b.minute + "'" : ""}</span>
    </div>`;
  }

  // Computes everything needed to render a scorer/cards breakdown for a
  // finished fixture, or tells the caller why there's nothing to show yet.
  function _scorerBreakdownParts(f) {
    const d = forFixture(f);
    if (!d || d.status !== "FINISHED") return { state: "not-finished" };
    const sc = getScorers(f);
    if (!sc || !sc.hasDetail) return { state: "pending" };

    const totalGoals = sc.home.length + sc.away.length;
    const totalCards = sc.bookings.home.length + sc.bookings.away.length;
    if (totalGoals === 0 && totalCards === 0) return { state: "empty" };

    return {
      state: "ready",
      totalGoals,
      totalCards,
      homeGoalsHtml: sc.home.map(_goalRowHtml).join("") ||
        '<div class="scorer-dd-empty">No goals</div>',
      awayGoalsHtml: sc.away.map(_goalRowHtml).join("") ||
        '<div class="scorer-dd-empty">No goals</div>',
      homeCardsHtml: sc.bookings.home.map(_cardRowHtml).join(""),
      awayCardsHtml: sc.bookings.away.map(_cardRowHtml).join(""),
    };
  }

  // Builds a clickable "Scorers ▾" toggle + collapsible panel for a
  // finished match. Returns '' if there's no goal-event data available
  // for this fixture (e.g. it's a future match, or detail hasn't synced
  // yet). The panel is collapsed by default; clicking the header toggles
  // a CSS class — no extra JS wiring needed beyond what's in styles.css
  // plus the tiny inline onclick below.
  //
  // homeLabel/awayLabel (+ optional flags) are used for the small column
  // headers above each side's goal list so it's clear which side is which
  // without having to cross-reference the scoreboard above.
  function scorerDropdownHtml(f, homeLabel, awayLabel, homeFlag, awayFlag) {
    const parts = _scorerBreakdownParts(f);
    if (parts.state === "not-finished" || parts.state === "empty") return "";
    if (parts.state === "pending") {
      // The match is over but goal-by-goal detail hasn't synced yet
      // (it's fetched in a separate, rate-limited pass). Say so instead
      // of just showing nothing, so it's clear more info is coming.
      return `<div class="scorer-pending-note">⚽ Goal scorer details will appear here once available</div>`;
    }

    const elId = `scorer-dd-${f.id}`;
    const homeHead = homeLabel
      ? `<div class="scorer-dd-head">${homeFlag ? `<span class="scorer-dd-head-flag">${homeFlag}</span>` : ""}${homeLabel}</div>`
      : "";
    const awayHead = awayLabel
      ? `<div class="scorer-dd-head">${awayFlag ? `<span class="scorer-dd-head-flag">${awayFlag}</span>` : ""}${awayLabel}</div>`
      : "";

    return `
      <button class="scorer-toggle" type="button"
        onclick="this.closest('.day-match-card,.ko-match-card,.match-row')?.classList.toggle('scorer-open'); this.querySelector('.scorer-toggle-arrow').classList.toggle('scorer-toggle-arrow--open')">
        <span>⚽ Goal scorers${parts.totalCards ? " & cards" : ""}</span>
        <span class="scorer-toggle-arrow">▾</span>
      </button>
      <div class="scorer-dd-panel" id="${elId}">
        <div class="scorer-dd-col">
          ${homeHead}${parts.homeGoalsHtml}${parts.homeCardsHtml}
        </div>
        <div class="scorer-dd-col scorer-dd-col--right">
          ${awayHead}${parts.awayGoalsHtml}${parts.awayCardsHtml}
        </div>
      </div>`;
  }

  // Builds a polished, always-expanded "featured match" card — used for
  // the Today / Yesterday highlights at the top of the home page. Shows
  // flags, the score (with AET/penalties line when relevant), the stage,
  // and — once the match is finished — the full scorer breakdown inline
  // (no click needed). For matches that haven't kicked off or are still
  // in progress, it shows the kickoff time / live badge instead.
  function miniMatchCardHtml(f, dHome, dAway, flagHome, flagAway, stageLabelText) {
    const d = forFixture(f);
    const isFinished = d && d.status === "FINISHED";
    const detail = scoreLabelDetailed(f);
    const badge = statusBadge(f);

    let subLine = "";
    if (isFinished && detail?.tag === "AET") {
      const bd = scoreBreakdown(f);
      subLine = bd?.duration === "PENALTY_SHOOTOUT" ? "Pens" : "AET";
    }

    const centerHtml = detail
      ? `<span class="fm-mini-score-val">${detail.main}</span>${detail.sub ? `<span class="fm-mini-score-sub">${subLine || detail.sub}</span>` : ""}`
      : `<span class="fm-mini-score-val fm-mini-score-val--vs">${I18n ? I18n.t("vs") : "vs"}</span>`;

    const timeOrBadge = isFinished || (d && d.status === "IN_PLAY") || (d && d.status === "PAUSED")
      ? badge
      : `<span class="fm-mini-kickoff">${f.tzTime}</span>`;

    return `<div class="fm-mini-card">
      <div class="fm-mini-top">
        <span class="fm-mini-stage">${stageLabelText || ""}</span>
        <span class="fm-mini-venue">📍 ${f.venue}</span>
      </div>
      <div class="fm-mini-teams">
        <div class="fm-mini-side">
          ${flagHome ? `<span class="fm-mini-flag">${flagHome}</span>` : ""}
          <span class="fm-mini-name">${dHome}</span>
        </div>
        <div class="fm-mini-center">
          ${centerHtml}
        </div>
        <div class="fm-mini-side fm-mini-side--right">
          <span class="fm-mini-name">${dAway}</span>
          ${flagAway ? `<span class="fm-mini-flag">${flagAway}</span>` : ""}
        </div>
      </div>
      <div class="fm-mini-foot">${timeOrBadge}</div>
      ${scorerDropdownHtml(f, dHome, dAway, flagHome, flagAway)}
    </div>`;
  }

  return {
    init,
    onUpdate,
    forFixture,
    scoreLabel,
    statusBadge,
    scorersHtml,
    scoreBreakdown,
    winnerSide,
    getScorers,
    scoreLabelDetailed,
    scoreBlockHtml,
    scorerDropdownHtml,
    miniMatchCardHtml,
    hasKey: true,
    getTopScorers,
  };
})();
