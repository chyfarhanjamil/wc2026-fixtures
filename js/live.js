/**
 * live.js — Real-time scores via Cloudflare Worker relay
 * Worker URL: https://plain-waterfall-0a87.onto2014.workers.dev
 *
 * The Worker calls football-data.org server-side (no CORS issue)
 * and returns the response with Access-Control-Allow-Origin: *
 * so every browser accepts it on desktop and mobile.
 */
'use strict';

const Live = (() => {

  // ── CONFIG ────────────────────────────────────────────────────────────
  const WORKER_URL = 'https://plain-waterfall-0a87.onto2014.workers.dev';
  const COMP_ID    = 2000;
  const SEASON     = 2026;
  const POLL_MS    = 60000;
  const LIVE_MS    = 30000;
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 5000;
  const CACHE_KEY_MATCHES = 'wc2026_v2_matches';
  const CACHE_KEY_SCORERS = 'wc2026_v2_scorers';

  // ── STATE ─────────────────────────────────────────────────────────────
  let liveData   = {};
  let topScorers = [];
  let listeners  = [];
  const hasKey   = true;

  // ── CACHE ─────────────────────────────────────────────────────────────
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

    // Show cached results immediately
    const hadCache = _loadCache();
    if (hadCache) { _notify(); _setBanner('cached'); }
    else { _setBanner('loading'); }

    _fetchWithRetry(RETRY_ATTEMPTS)
      .then(() => {
        _setBanner(Object.keys(liveData).length > 0 ? 'live' : 'waiting');
        setInterval(fetchAll, POLL_MS);
        setInterval(() => {
          const anyLive = Object.values(liveData).some(
            d => d.status === 'IN_PLAY' || d.status === 'PAUSED'
          );
          if (anyLive) fetchLive();
        }, LIVE_MS);
      })
      .catch(err => {
        console.error('[Live] all retries failed:', err);
        _setBanner(hadCache ? 'cached_error' : 'error', err.message);
      });
  }

  async function _fetchWithRetry(attempts) {
    for (let i = 0; i < attempts; i++) {
      try { await fetchAll(); return; }
      catch(e) {
        console.warn(`[Live] attempt ${i+1}/${attempts} failed:`, e.message);
        if (i < attempts - 1) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        else throw e;
      }
    }
  }

  // ── API FETCH via Worker ───────────────────────────────────────────────
  // Worker is at: https://plain-waterfall-0a87.onto2014.workers.dev
  // We just replace the football-data.org base URL with the Worker URL.
  // The Worker adds the API key and CORS headers server-side.
  async function _apiFetch(path) {
    const url = `${WORKER_URL}${path}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
    }
    const json = await res.json();
    if (path.includes('/matches') && !json.matches)
      throw new Error('No matches in response: ' + JSON.stringify(json).slice(0, 100));
    return json;
  }

  // ── FULL POLL ─────────────────────────────────────────────────────────
  async function fetchAll() {
    const [matchRes, scorerRes] = await Promise.allSettled([
      _apiFetch(`/competitions/${COMP_ID}/matches?season=${SEASON}`),
      _apiFetch(`/competitions/${COMP_ID}/scorers?season=${SEASON}&limit=100`),
    ]);
    if (matchRes.status === 'rejected' && scorerRes.status === 'rejected')
      throw matchRes.reason;
    if (matchRes.status  === 'fulfilled') _ingestMatches(matchRes.value.matches  || []);
    if (scorerRes.status === 'fulfilled') _ingestScorers(scorerRes.value.scorers || []);
    else console.warn('[Live] scorers failed:', scorerRes.reason?.message);
    _saveCache();
    _notify();
  }

  // ── LIVE POLL ─────────────────────────────────────────────────────────
  async function fetchLive() {
    try {
      const data = await _apiFetch(
        `/competitions/${COMP_ID}/matches?status=IN_PLAY,PAUSED&season=${SEASON}`
      );
      _ingestMatches(data.matches || []);
      _saveCache();
      _notify();
    } catch(e) { console.warn('[Live] fetchLive:', e.message); }
  }

  // ── CANON MAP ─────────────────────────────────────────────────────────
  const CANON_MAP = {
    'mexico':'Mexico','south africa':'South Africa',
    'korea republic':'Korea Republic','republic of korea':'Korea Republic','south korea':'Korea Republic',
    'czechia':'Czechia','czech republic':'Czechia',
    'canada':'Canada',
    'bosnia and herzegovina':'Bosnia & Herzegovina','bosnia & herzegovina':'Bosnia & Herzegovina','bosnia-herzegovina':'Bosnia & Herzegovina',
    'qatar':'Qatar','switzerland':'Switzerland',
    'brazil':'Brazil','morocco':'Morocco','haiti':'Haiti','scotland':'Scotland',
    'united states':'USA','united states of america':'USA','usa':'USA','us':'USA',
    'paraguay':'Paraguay','australia':'Australia',
    'türkiye':'Türkiye','turkiye':'Türkiye','turkey':'Türkiye',
    'germany':'Germany',
    'curaçao':'Curaçao','curacao':'Curaçao',
    'ivory coast':'Ivory Coast',"côte d'ivoire":'Ivory Coast',"cote d'ivoire":'Ivory Coast',
    'ecuador':'Ecuador',
    'netherlands':'Netherlands','holland':'Netherlands',
    'japan':'Japan','tunisia':'Tunisia','sweden':'Sweden',
    'belgium':'Belgium','egypt':'Egypt','iran':'Iran','new zealand':'New Zealand',
    'spain':'Spain','cabo verde':'Cabo Verde','cape verde':'Cabo Verde',
    'saudi arabia':'Saudi Arabia','ksa':'Saudi Arabia',
    'uruguay':'Uruguay','france':'France','senegal':'Senegal','iraq':'Iraq','norway':'Norway',
    'argentina':'Argentina','algeria':'Algeria','austria':'Austria','jordan':'Jordan',
    'portugal':'Portugal',
    'congo dr':'Congo DR','dr congo':'Congo DR','democratic republic of congo':'Congo DR',
    'democratic republic of the congo':'Congo DR','congo, dr':'Congo DR',
    'uzbekistan':'Uzbekistan','colombia':'Colombia',
    'england':'England','croatia':'Croatia','ghana':'Ghana','panama':'Panama',
  };

  function _canon(name) {
    if (!name) return '';
    const key = name.toLowerCase().trim();
    if (CANON_MAP[key]) return CANON_MAP[key];
    const stripped = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (CANON_MAP[stripped]) return CANON_MAP[stripped];
    for (const [k, v] of Object.entries(CANON_MAP)) {
      if (k.normalize('NFD').replace(/[\u0300-\u036f]/g,'') === stripped) return v;
    }
    return name.trim();
  }

  // ── UTC INDEX ─────────────────────────────────────────────────────────
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
      const payload = {
        status:    m.status,
        scoreHome: ft.home ?? null,
        scoreAway: ft.away ?? null,
        htHome:    ht.home ?? null,
        htAway:    ht.away ?? null,
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

      const hc     = _canon(m.homeTeam?.name || '');
      const ac     = _canon(m.awayTeam?.name || '');
      const utcKey = (m.utcDate || '').slice(0, 16);

      // Route 1: UTC time — works for all stages
      const timeMatches = _utcIndex.get(utcKey) || [];
      if (timeMatches.length === 1) {
        liveData[`local_${timeMatches[0].id}`] = payload; return;
      }
      if (timeMatches.length > 1) {
        const hit = timeMatches.find(f => _canon(f.home) === hc && _canon(f.away) === ac);
        if (hit) { liveData[`local_${hit.id}`] = payload; return; }
      }

      // Route 2: name fallback for group stage
      WC2026.FIXTURES.forEach(f => {
        if (f.stage !== 'group') return;
        if (_canon(f.home) === hc && _canon(f.away) === ac)
          liveData[`local_${f.id}`] = payload;
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
      loading:      '⏳ Loading match data…',
      cached:       '📦 Showing saved results — refreshing…',
      cached_error: '⚠️ Could not refresh — showing last saved results.',
      waiting:      '📅 Connected — scores appear when matches kick off.',
      live:         '🟢 Live — updates every 60 s.',
      error:        '⚠️ Could not load data. Please refresh.',
    };
    el.className = `live-banner live-banner--${type}`;
    el.innerHTML = `<span>${msgs[type] || ''}${detail
      ? ` <code style="opacity:.7;font-size:11px">(${detail})</code>` : ''}</span>`;
    el.style.display = 'block';
    if (['live','waiting','cached'].includes(type))
      setTimeout(() => { el.style.display = 'none'; }, 8000);
  }

  // ── PUBLIC ────────────────────────────────────────────────────────────
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
    if (d.status === 'IN_PLAY')  return `<span class="badge badge--live">🔴 LIVE${d.minute ? ' '+d.minute+"'" : ''}</span>`;
    if (d.status === 'PAUSED')   return `<span class="badge badge--ht">⏸ HT</span>`;
    if (d.status === 'FINISHED') return `<span class="badge badge--ft">FT</span>`;
    return '';
  }

  function scorersHtml(f) {
    const d = forFixture(f);
    if (!d || !d.scorers?.length) return '';
    return `<div class="scorers-row">${d.scorers.map(g => {
      const ico = g.type==='OWN_GOAL' ? '⚽(OG)' : g.type==='PENALTY' ? '⚽(P)' : '⚽';
      return `<span class="scorer-item">${ico} ${g.player} <b>${g.minute}'</b></span>`;
    }).join('<span class="scorer-sep"> · </span>')}</div>`;
  }

  function getTopScorers() { return topScorers; }

  return { init, onUpdate, forFixture, scoreLabel, statusBadge, scorersHtml, hasKey, getTopScorers };
})();