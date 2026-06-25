/**
 * live.js — reads scores from /data/matches.json + /data/scorers.json
 *
 * These two JSON files live inside YOUR OWN GitHub repo.
 * A GitHub Actions workflow updates them every 2 minutes by calling
 * football-data.org from GitHub's servers (no CORS, no restrictions).
 *
 * Your browser only ever fetches from YOUR OWN domain (same origin).
 * No external URLs. No proxies. No Cloudflare.
 * Works on every browser, every network, including restricted ones.
 */
'use strict';

const Live = (() => {

  // ── CONFIG ────────────────────────────────────────────────────────────
  const POLL_MS           = 120000; // re-read JSON every 2 min
  const CACHE_KEY_MATCHES = 'wc2026_v2_matches';
  const CACHE_KEY_SCORERS = 'wc2026_v2_scorers';

  // ── STATE ─────────────────────────────────────────────────────────────
  let liveData   = {};
  let topScorers = [];
  let listeners  = [];
  const hasKey   = true;

  // ── CACHE (localStorage) ──────────────────────────────────────────────
  // Saves results after every fetch so they survive page reloads instantly.
  function _saveCache() {
    try {
      localStorage.setItem(CACHE_KEY_MATCHES, JSON.stringify(liveData));
      localStorage.setItem(CACHE_KEY_SCORERS, JSON.stringify(topScorers));
    } catch(e) {}
  }

  function _loadCache() {
    try {
      const m = localStorage.getItem(CACHE_KEY_MATCHES);
      const s = localStorage.getItem(CACHE_KEY_SCORERS);
      if (m) liveData   = JSON.parse(m);
      if (s) topScorers = JSON.parse(s);
      return Object.keys(liveData).length > 0;
    } catch(e) { return false; }
  }

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    _buildUtcIndex();

    // Load cache first — previous results show instantly with zero delay
    const hadCache = _loadCache();
    if (hadCache) { _notify(); }
    // Always show "fetching" banner so user knows a refresh is happening
    _setBanner('loading');

    // Then fetch fresh data in the background
    fetchAll()
      .then(() => {
        _setBanner(Object.keys(liveData).length > 0 ? 'live' : 'waiting');
        // Keep polling every 2 min to pick up new GitHub Actions commits
        setInterval(() => { _setBanner('loading'); fetchAll()
          .then(() => _setBanner(Object.keys(liveData).length > 0 ? 'live' : 'waiting'))
          .catch(err => _setBanner('cached_error', err.message));
        }, POLL_MS);
      })
      .catch(err => {
        console.error('[Live] fetch failed:', err);
        _setBanner(hadCache ? 'cached_error' : 'error', err.message);
      });
  }

  // ── FETCH from same-domain JSON files ─────────────────────────────────
  // ?t=timestamp busts the browser cache so we always get the latest file.
  async function fetchAll() {
    const t = Date.now();
    const [matchRes, scorerRes] = await Promise.allSettled([
      fetch(`data/matches.json?t=${t}`)
        .then(r => { if (!r.ok) throw new Error(`matches ${r.status}`); return r.json(); }),
      fetch(`data/scorers.json?t=${t}`)
        .then(r => { if (!r.ok) throw new Error(`scorers ${r.status}`); return r.json(); }),
    ]);

    // If BOTH fail (files don't exist yet), throw so caller knows
    if (matchRes.status === 'rejected' && scorerRes.status === 'rejected')
      throw new Error('JSON files not found — has the GitHub Action run yet?');

    if (matchRes.status  === 'fulfilled') _ingestMatches(matchRes.value.matches  || []);
    if (scorerRes.status === 'fulfilled') _ingestScorers(scorerRes.value.scorers || []);
    else console.warn('[Live] scorers not ready yet');

    _saveCache();
    _notify();
  }

  // ── CANON MAP — API name → data.js name ──────────────────────────────
  const CANON_MAP = {
    'mexico':'Mexico','south africa':'South Africa',
    'korea republic':'Korea Republic','republic of korea':'Korea Republic','south korea':'Korea Republic',
    'czechia':'Czechia','czech republic':'Czechia',
    'canada':'Canada',
    'bosnia and herzegovina':'Bosnia & Herzegovina',
    'bosnia & herzegovina':'Bosnia & Herzegovina',
    'bosnia-herzegovina':'Bosnia & Herzegovina',
    'qatar':'Qatar','switzerland':'Switzerland',
    'brazil':'Brazil','morocco':'Morocco','haiti':'Haiti','scotland':'Scotland',
    'united states':'USA','united states of america':'USA','usa':'USA','us':'USA',
    'paraguay':'Paraguay','australia':'Australia',
    'türkiye':'Türkiye','turkiye':'Türkiye','turkey':'Türkiye',
    'germany':'Germany',
    'curaçao':'Curaçao','curacao':'Curaçao',
    'ivory coast':'Ivory Coast',
    "côte d'ivoire":'Ivory Coast',"cote d'ivoire":'Ivory Coast',
    'ecuador':'Ecuador',
    'netherlands':'Netherlands','holland':'Netherlands',
    'japan':'Japan','tunisia':'Tunisia','sweden':'Sweden',
    'belgium':'Belgium','egypt':'Egypt','iran':'Iran','new zealand':'New Zealand',
    'spain':'Spain','cabo verde':'Cabo Verde','cape verde':'Cabo Verde',
    'saudi arabia':'Saudi Arabia','ksa':'Saudi Arabia',
    'uruguay':'Uruguay','france':'France','senegal':'Senegal',
    'iraq':'Iraq','norway':'Norway',
    'argentina':'Argentina','algeria':'Algeria','austria':'Austria','jordan':'Jordan',
    'portugal':'Portugal',
    'congo dr':'Congo DR','dr congo':'Congo DR',
    'democratic republic of congo':'Congo DR',
    'democratic republic of the congo':'Congo DR','congo, dr':'Congo DR',
    'uzbekistan':'Uzbekistan','colombia':'Colombia',
    'england':'England','croatia':'Croatia','ghana':'Ghana','panama':'Panama',
    // Extra aliases seen in the API responses
    'cape verde islands':'Cabo Verde','cape verde':'Cabo Verde',
    'bosnia-herzegovina':'Bosnia & Herzegovina',
    'bosnia and herzegovina':'Bosnia & Herzegovina',
    'south korea':'Korea Republic','republic of korea':'Korea Republic',
    'congo, dr':'Congo DR','dr. congo':'Congo DR',
  };

  function _canon(name) {
    if (!name) return '';
    const key = name.toLowerCase().trim();
    if (CANON_MAP[key]) return CANON_MAP[key];
    const stripped = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (CANON_MAP[stripped]) return CANON_MAP[stripped];
    for (const [k, v] of Object.entries(CANON_MAP))
      if (k.normalize('NFD').replace(/[\u0300-\u036f]/g,'') === stripped) return v;
    return name.trim();
  }

  // ── UTC INDEX — kick-off time → fixture lookup ────────────────────────
  let _utcIndex = null;

  function _buildUtcIndex() {
    _utcIndex = new Map();
    WC2026.FIXTURES.forEach(f => {
      if (!f.utc) return;
      const key = f.utc.slice(0, 16);
      if (!_utcIndex.has(key)) _utcIndex.set(key, []);
      _utcIndex.get(key).push(f);
    });
  }

  // ── INGEST MATCHES ────────────────────────────────────────────────────
  function _ingestMatches(matches) {
    if (!_utcIndex) _buildUtcIndex();

    matches.forEach(m => {
      const ft = m.score?.fullTime || {};
      const ht = m.score?.halfTime || {};

      const hc     = _canon(m.homeTeam?.name || '');
      const ac     = _canon(m.awayTeam?.name || '');
      const utcKey = (m.utcDate || '').slice(0, 16);

      // Helper: build payload, swapping scores if API home/away is reversed vs fixture
      function _makePayload(fixtureHome) {
        const reversed = fixtureHome && _canon(fixtureHome) !== hc;
        return {
          status:    m.status,
          scoreHome: reversed ? (ft.away ?? null) : (ft.home ?? null),
          scoreAway: reversed ? (ft.home ?? null) : (ft.away ?? null),
          htHome:    reversed ? (ht.away ?? null) : (ht.home ?? null),
          htAway:    reversed ? (ht.home ?? null) : (ht.away ?? null),
          minute:    m.minute || null,
          homeApi:   m.homeTeam?.name || '',
          awayApi:   m.awayTeam?.name || '',
          scorers: (m.goals || []).map(g => ({
            team:   _canon(g.team?.name || ''),
            player: g.scorer?.name     || 'Own Goal',
            minute: g.minute,
            type:   g.type             || 'REGULAR',
          })),
        };
      }

      // Route 1: match by UTC kick-off time (works for ALL stages)
      const timeMatches = _utcIndex.get(utcKey) || [];
      if (timeMatches.length === 1) {
        liveData[`local_${timeMatches[0].id}`] = _makePayload(timeMatches[0].home); return;
      }
      if (timeMatches.length > 1) {
        // Same kick-off slot (simultaneous matches) — break tie by team name.
        // The API sometimes swaps home/away vs our fixture list, so check both orderings.
        const hit = timeMatches.find(
          f => (_canon(f.home) === hc && _canon(f.away) === ac) ||
               (_canon(f.home) === ac && _canon(f.away) === hc)
        );
        if (hit) { liveData[`local_${hit.id}`] = _makePayload(hit.home); return; }
      }

      // Route 2: team name fallback (group stage only)
      // Also tolerates home/away reversal from the API.
      WC2026.FIXTURES.forEach(f => {
        if (f.stage !== 'group') return;
        if ((_canon(f.home) === hc && _canon(f.away) === ac) ||
            (_canon(f.home) === ac && _canon(f.away) === hc))
          liveData[`local_${f.id}`] = _makePayload(f.home);
      });
    });
  }

  // ── INGEST SCORERS ────────────────────────────────────────────────────
  function _ingestScorers(scorers) {
    topScorers = scorers.map(s => ({
      name:          s.player?.name        || '?',
      nationality:   s.player?.nationality || '',
      teamRaw:       s.team?.name          || '',
      goals:         s.goals               || 0,
      assists:       s.assists             || 0,
      penalties:     s.penalties           || 0,
      playedMatches: s.playedMatches       || 0,
    }));
  }

  // ── NOTIFY ────────────────────────────────────────────────────────────
  function _notify() {
    listeners.forEach(fn => { try { fn(liveData); } catch(e) {} });
  }

  // ── BANNER ────────────────────────────────────────────────────────────
  function _setBanner(type, detail) {
    const el = document.getElementById('liveBanner');
    if (!el) return;
    const msgs = {
      loading:      '⏳ Fetching latest scores…',
      cached:       '📦 Showing saved results — refreshing…',
      cached_error: '⚠️ Could not refresh — showing last saved results.',
      waiting:      '📅 Live — scores will appear when matches kick off.',
      live:         '🟢 Live data loaded — updates every 2 min.',
      error:        '⚠️ Score files not ready yet — please refresh in a moment.',
    };
    // Clear any pending hide timer
    if (el._hideTimer) { clearTimeout(el._hideTimer); el._hideTimer = null; }
    el.className = `live-banner live-banner--${type}`;
    el.style.opacity = '1';
    el.style.transition = '';
    el.innerHTML = `<span>${msgs[type] || ''}${detail
      ? ` <code style="opacity:.7;font-size:11px">(${detail})</code>` : ''}</span>`;
    el.style.display = 'block';
    // Auto-hide with fade for success/info states; keep error states visible longer
    const hideDelay = type === 'loading' ? null :
                      ['error','cached_error'].includes(type) ? 10000 : 4000;
    if (hideDelay !== null) {
      el._hideTimer = setTimeout(() => {
        el.style.transition = 'opacity 0.6s ease';
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; el.style.opacity = '1'; }, 650);
      }, hideDelay);
    }
  }

  // ── PUBLIC API (unchanged — no other file needs to change) ────────────
  function onUpdate(fn) { listeners.push(fn); }
  function forFixture(f) { return liveData[`local_${f.id}`] || null; }

  function scoreLabel(f) {
    const d = forFixture(f);
    if (!d || d.scoreHome === null) return null;
    return `${d.scoreHome}–${d.scoreAway}`;
  }

  function statusBadge(f) {
    const d = forFixture(f);
    if (!d) return '';
    if (d.status === 'IN_PLAY')
      return `<span class="badge badge--live">🔴 LIVE${d.minute ? ' '+d.minute+"'" : ''}</span>`;
    if (d.status === 'PAUSED')
      return `<span class="badge badge--ht">⏸ HT</span>`;
    if (d.status === 'FINISHED')
      return `<span class="badge badge--ft">FT</span>`;
    return '';
  }

  function scorersHtml(f) {
    const d = forFixture(f);
    if (!d || !d.scorers?.length) return '';
    return `<div class="scorers-row">${
      d.scorers.map(g => {
        const ico = g.type==='OWN_GOAL' ? '⚽(OG)' : g.type==='PENALTY' ? '⚽(P)' : '⚽';
        return `<span class="scorer-item">${ico} ${g.player} <b>${g.minute}'</b></span>`;
      }).join('<span class="scorer-sep"> · </span>')
    }</div>`;
  }

  function getTopScorers() { return topScorers; }

  return {
    init, onUpdate,
    forFixture, scoreLabel, statusBadge, scorersHtml,
    hasKey, getTopScorers,
  };
})();
