/**
 * live.js — Real-time data from football-data.org
 * API key is already set below.
 * Competition 2000 = FIFA World Cup (all editions including 2026)
 *
 * FREE TIER gives you:
 *   ✅ Live scores (IN_PLAY, PAUSED, FINISHED)
 *   ✅ Full-time & half-time scores
 *   ✅ Goal scorers (name + minute) via m.goals[]
 *   ✅ Top scorers leaderboard via /scorers endpoint
 *   ✅ Assists (in /scorers response)
 *   ❌ Yellow/Red cards (paid tier only)
 *   ❌ GK save data (paid tier only)
 *
 * FIX LOG:
 *   v2 - Fix 1: Desktop CORS failure — proxy sent X-Auth-Token header which
 *        triggers preflight on desktop browsers. Now embed the key as a query
 *        param on the proxy URL instead, and add a third proxy fallback.
 *   v2 - Fix 2: Missing matches — previously only group-stage fixtures were
 *        matched (hard `return` on stage !== 'group'). Now ALL fixtures are
 *        matched by UTC kick-off time (primary) and by team-name canonicali-
 *        sation (secondary, for group stage). Once knock-out teams are known
 *        the API returns real names; UTC matching catches them.
 *   v2 - Fix 3: Canon map extended with additional API name variants and
 *        normalisation of accented characters to avoid silent drops.
 */
'use strict';

const Live = (() => {

  // ── CONFIG ────────────────────────────────────────────────────────────
  const API_KEY = '72f45df7ce7b4991ac9ebd929bf4c53d';   // football-data.org
  const COMP_ID = 2000;   // FIFA World Cup (football-data.org ID)
  const SEASON  = 2026;
  const POLL_MS  = 60000;  // re-poll every 60s normally
  const LIVE_MS  = 30000;  // re-poll every 30s when a match is IN_PLAY

  // ── STATE ─────────────────────────────────────────────────────────────
  let liveData   = {};    // keyed "local_<fixtureId>" → match payload
  let topScorers = [];    // from /scorers endpoint
  let listeners  = [];
  const hasKey   = !!API_KEY;

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    if (!hasKey) { _setBanner('static'); return; }
    _setBanner('loading');
    fetchAll().then(() => {
      const gotData = Object.keys(liveData).length > 0;
      _setBanner(gotData ? 'live' : 'waiting');
      setInterval(fetchAll, POLL_MS);
      setInterval(() => {
        const anyLive = Object.values(liveData).some(
          d => d.status === 'IN_PLAY' || d.status === 'PAUSED'
        );
        if (anyLive) fetchLive();
      }, LIVE_MS);
    }).catch(err => {
      console.error('[Live] init failed:', err);
      _setBanner('error', err.message);
    });
  }

  // ── API FETCH (FIX 1: desktop CORS) ──────────────────────────────────
  //
  // Problem: football-data.org requires the API key in the X-Auth-Token
  // request header. Custom headers trigger a CORS preflight (OPTIONS) request
  // on desktop browsers. The free CORS proxies (corsproxy.io, allorigins)
  // do not reliably forward preflights or the X-Auth-Token header on desktop,
  // causing the request to fail with a CORS error before it even reaches the
  // API. Mobile iOS uses a more lenient WKWebView CORS model, which is why it
  // works there.
  //
  // Fix: Use the football-data.org ?token= query-parameter authentication
  // mechanism (documented in their API). This avoids the need for a custom
  // header entirely, so there is no preflight, and all proxies work normally
  // on both desktop and mobile.
  //
  // Three proxies are tried in order for resilience.
  const CORS_PROXIES = [
    target => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
    target => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    target => `https://thingproxy.freeboard.io/fetch/${target}`,
  ];

  async function _apiFetch(path) {
    // Append API key as query param — avoids custom headers → no CORS preflight
    const sep    = path.includes('?') ? '&' : '?';
    const target = `https://api.football-data.org/v4${path}${sep}token=${API_KEY}`;
    let lastErr;

    for (const buildUrl of CORS_PROXIES) {
      try {
        const res = await fetch(buildUrl(target), {
          // No custom headers — key is in the URL now
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`${res.status} ${text.slice(0, 120)}`);
        }
        return await res.json();
      } catch (e) {
        lastErr = e;
        console.warn('[Live] proxy failed, trying next:', e.message);
      }
    }
    throw lastErr;
  }

  // Full poll — matches + scorers
  async function fetchAll() {
    const [matchRes, scorerRes] = await Promise.allSettled([
      _apiFetch(`/competitions/${COMP_ID}/matches?season=${SEASON}`),
      _apiFetch(`/competitions/${COMP_ID}/scorers?season=${SEASON}&limit=100`),
    ]);
    if (matchRes.status  === 'fulfilled') _ingestMatches(matchRes.value.matches  || []);
    if (scorerRes.status === 'fulfilled') _ingestScorers(scorerRes.value.scorers || []);
    else console.warn('[Live] scorers fetch failed:', scorerRes.reason?.message);
    _notify();
    return true;
  }

  // Fast poll — only live matches
  async function fetchLive() {
    try {
      const data = await _apiFetch(
        `/competitions/${COMP_ID}/matches?status=IN_PLAY,PAUSED&season=${SEASON}`
      );
      _ingestMatches(data.matches || []);
      _notify();
    } catch (e) { console.warn('[Live] fetchLive error:', e.message); }
  }

  // ── TEAM NAME CANONICALISATION ────────────────────────────────────────
  // Maps every name variant the API might send → the name used in data.js.
  // Extended in v2 to cover additional API variants that caused silent drops.
  const CANON_MAP = {
    // USA
    'united states':                'usa',
    'usa':                          'usa',
    'us':                           'usa',
    // Korea
    'korea republic':               'korea republic',
    'south korea':                  'korea republic',
    'republic of korea':            'korea republic',
    // Ivory Coast
    "côte d'ivoire":                'ivory coast',
    "cote d'ivoire":                'ivory coast',
    'ivory coast':                  'ivory coast',
    // Bosnia
    'bosnia and herzegovina':       'bosnia & herzegovina',
    'bosnia & herzegovina':         'bosnia & herzegovina',
    'bosnia-herzegovina':           'bosnia & herzegovina',
    // Türkiye
    'türkiye':                      'türkiye',
    'turkey':                       'türkiye',
    'turkiye':                      'türkiye',
    // Congo DR
    'congo dr':                     'congo dr',
    'dr congo':                     'congo dr',
    'democratic republic of congo': 'congo dr',
    'democratic republic of the congo': 'congo dr',
    'congo, dr':                    'congo dr',
    // Cabo Verde
    'cape verde':                   'cabo verde',
    'cabo verde':                   'cabo verde',
    // Curaçao
    'curaçao':                      'curaçao',
    'curacao':                      'curaçao',
    // England
    'england':                      'england',
    // Scotland
    'scotland':                     'scotland',
    // New Zealand
    'new zealand':                  'new zealand',
    'nz':                           'new zealand',
    // Saudi Arabia
    'saudi arabia':                 'saudi arabia',
    'ksa':                          'saudi arabia',
    // Netherlands
    'netherlands':                  'netherlands',
    'holland':                      'netherlands',
  };

  function _canon(name) {
    if (!name) return '';
    return CANON_MAP[
      name.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip diacritics
        .replace(/ü/g, 'u').replace(/ä/g, 'a').replace(/ö/g, 'o') // fallback for pre-NFD
    ] || name.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        || name.toLowerCase().trim();
  }

  // ── UTC TIME LOOKUP (FIX 2: match all stages, not just group) ─────────
  //
  // Problem: _ingestMatches previously bailed out with `return` for any
  // fixture where stage !== 'group', so knockout results were never stored
  // even once the API returned real team names (post group-stage).
  //
  // Additionally, for group-stage matches that aren't found by team-name
  // (e.g. due to a missing CANON_MAP entry), there was no fallback.
  //
  // Fix: Build a UTC kick-off → fixture ID lookup at startup. The API
  // response always includes `m.utcDate`. We normalise both sides to the
  // nearest minute and use it as the primary key, which works for every
  // stage. Team-name matching is kept as a secondary route for group stage
  // so that matches with identical kick-off times (same slot, diff venues)
  // are still disambiguated correctly.
  let _utcToFixture = null;   // Map<"YYYY-MM-DDTHH:MM" → fixture>

  function _buildUtcIndex() {
    if (_utcToFixture) return;
    _utcToFixture = new Map();
    WC2026.FIXTURES.forEach(f => {
      if (!f.utc) return;
      const key = f.utc.slice(0, 16); // "YYYY-MM-DDTHH:MM"
      // Multiple fixtures can share a slot — store as array
      if (!_utcToFixture.has(key)) _utcToFixture.set(key, []);
      _utcToFixture.get(key).push(f);
    });
  }

  // ── INGEST MATCHES ────────────────────────────────────────────────────
  function _ingestMatches(matches) {
    _buildUtcIndex();

    matches.forEach(m => {
      const ft = m.score?.fullTime || {};
      const ht = m.score?.halfTime || {};
      const payload = {
        status:    m.status,
        scoreHome: ft.home ?? null,
        scoreAway: ft.away ?? null,
        htHome:    ht.home ?? null,
        htAway:    ht.away ?? null,
        minute:    m.minute  || null,
        homeApi:   m.homeTeam?.name || '',
        awayApi:   m.awayTeam?.name || '',
        scorers: (m.goals || []).map(g => ({
          team:   _canon(g.team?.name   || ''),
          player: g.scorer?.name        || 'Own Goal',
          minute: g.minute,
          type:   g.type                || 'REGULAR',
        })),
      };

      const hc = _canon(m.homeTeam?.name || '');
      const ac = _canon(m.awayTeam?.name || '');
      const apiUtcKey = (m.utcDate || '').slice(0, 16);

      // --- Route 1: UTC time match (works for ALL stages) ---
      const timeMatches = _utcToFixture.get(apiUtcKey) || [];

      if (timeMatches.length === 1) {
        // Only one fixture at this time slot — unambiguous
        liveData[`local_${timeMatches[0].id}`] = payload;
        return; // done for this API match
      }

      if (timeMatches.length > 1) {
        // Multiple fixtures share this slot (e.g. final group matchday).
        // Disambiguate by team names for group stage; for KO just assign
        // by team name if we can resolve, otherwise skip to name-match below.
        const byName = timeMatches.find(f =>
          _canon(f.home) === hc && _canon(f.away) === ac
        );
        if (byName) {
          liveData[`local_${byName.id}`] = payload;
          return;
        }
      }

      // --- Route 2: Team-name match (fallback, group stage only reliable) ---
      WC2026.FIXTURES.forEach(f => {
        if (f.stage !== 'group') return; // KO home/away are TBD placeholders
        if (_canon(f.home) === hc && _canon(f.away) === ac) {
          liveData[`local_${f.id}`] = payload;
        }
      });
    });
  }

  // ── INGEST SCORERS ────────────────────────────────────────────────────
  function _ingestScorers(scorers) {
    topScorers = scorers.map(s => ({
      name:          s.player?.name         || '?',
      nationality:   s.player?.nationality  || '',
      teamRaw:       s.team?.name           || '',
      goals:         s.goals                || 0,
      assists:       s.assists              || 0,
      penalties:     s.penalties            || 0,
      playedMatches: s.playedMatches        || 0,
    }));
  }

  // ── NOTIFY LISTENERS ─────────────────────────────────────────────────
  function _notify() {
    listeners.forEach(fn => { try { fn(liveData); } catch (e) {} });
  }

  // ── BANNER ────────────────────────────────────────────────────────────
  function _setBanner(type, detail) {
    const el = document.getElementById('liveBanner');
    if (!el) return;
    const msgs = {
      static:  '📋 No API key set — showing static fixture data only.',
      loading: '⏳ Connecting to live data…',
      waiting: '📅 Connected — live scores will appear once matches kick off.',
      live:    '🟢 Live data active — scores update every 60 s.',
      error:   '⚠️ Could not connect to live data. Showing static fixtures.',
    };
    el.className  = `live-banner live-banner--${type}`;
    el.innerHTML  = `<span>${msgs[type]}${detail ? ' <code style="opacity:.7;font-size:11px">(' + detail + ')</code>' : ''}</span>`;
    el.style.display = 'block';
    if (type === 'live' || type === 'waiting') {
      setTimeout(() => { el.style.display = 'none'; }, 8000);
    }
  }

  // ── PUBLIC HELPERS ────────────────────────────────────────────────────
  function onUpdate(fn) { listeners.push(fn); }

  function forFixture(f) {
    return liveData[`local_${f.id}`] || null;
  }

  function scoreLabel(f) {
    const d = forFixture(f);
    if (!d || d.scoreHome === null) return null;
    return `${d.scoreHome}–${d.scoreAway}`;
  }

  function statusBadge(f) {
    const d = forFixture(f);
    if (!d) return '';
    if (d.status === 'IN_PLAY')  return `<span class="badge badge--live">🔴 LIVE${d.minute ? ' ' + d.minute + "'" : ''}</span>`;
    if (d.status === 'PAUSED')   return `<span class="badge badge--ht">⏸ HT</span>`;
    if (d.status === 'FINISHED') return `<span class="badge badge--ft">FT</span>`;
    return '';
  }

  function scorersHtml(f) {
    const d = forFixture(f);
    if (!d || !d.scorers || !d.scorers.length) return '';
    const items = d.scorers.map(g => {
      const ico = g.type === 'OWN_GOAL' ? '⚽(OG)' : g.type === 'PENALTY' ? '⚽(P)' : '⚽';
      return `<span class="scorer-item">${ico} ${g.player} <b>${g.minute}'</b></span>`;
    });
    return `<div class="scorers-row">${items.join('<span class="scorer-sep"> · </span>')}</div>`;
  }

  function getTopScorers() { return topScorers; }

  return {
    init, onUpdate,
    forFixture, scoreLabel, statusBadge, scorersHtml,
    hasKey, getTopScorers,
  };
})();