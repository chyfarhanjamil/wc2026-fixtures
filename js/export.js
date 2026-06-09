/**
 * export.js — .ics calendar export (i18n-aware)
 */
'use strict';

const Export = (() => {
  let selectedTeams = new Set();
  let allSelected   = false;

  function pad(n) { return String(n).padStart(2,'0'); }

  function toICSDateTime(utcStr, addHours = 0) {
    const d = new Date(utcStr);
    if (addHours) d.setHours(d.getHours() + addHours);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}` +
           `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  }

  function buildICS(fixtures, teamNames) {
    const now    = toICSDateTime(new Date().toISOString());
    const events = fixtures.map((f,i) => [
      'BEGIN:VEVENT',
      `UID:wc2026-m${f.id}-${i}@wc2026fixtures`,
      `DTSTAMP:${now}`,
      `DTSTART:${toICSDateTime(f.utc)}`,
      `DTEND:${toICSDateTime(f.utc,2)}`,
      `SUMMARY:⚽ ${f.home} vs ${f.away}${f.group ? ` (Group ${f.group})` : ` (${f.label})`}`,
      `DESCRIPTION:FIFA World Cup 2026\\n${f.home} vs ${f.away}\\n${f.label}\\nTime: ${f.tzTime}\\nVenue: ${f.venue}`,
      `LOCATION:${f.venue}`,
      'END:VEVENT',
    ].join('\r\n'));
    return [
      'BEGIN:VCALENDAR','VERSION:2.0',
      'PRODID:-//WC2026 Fixtures//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
      `X-WR-CALNAME:FIFA World Cup 2026 – ${teamNames.length===WC2026.teams.length ? 'All Matches' : teamNames.join(', ')}`,
      'X-WR-TIMEZONE:Asia/Dhaka',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');
  }

  function open() {
    // Update modal text with current language
    document.querySelector('.modal-title').textContent    = I18n.t('export_title');
    document.querySelector('.modal-sub').textContent      = I18n.t('export_sub');
    document.querySelector('.modal-section-label').textContent = I18n.t('select_teams_label');
    document.getElementById('selectAllBtn').textContent   = I18n.t('select_all');
    document.getElementById('downloadBtn').textContent    = I18n.t('download_ics');
    document.querySelector('.ics-note').innerHTML =
      I18n.t('ics_note_iphone') + '<br>' + I18n.t('ics_note_google');

    const g = document.getElementById('teamSelectGrid');
    g.innerHTML = '';
    selectedTeams.clear();
    allSelected = false;
    updateBtn();

    const q = (document.getElementById('search').value || '').toLowerCase().trim();

    WC2026.teams.forEach(team => {
      const flag        = WC2026.FLAGS[team] || '🏳️';
      const grp         = WC2026.teamMap[team].group;
      const preSelected = q && team.toLowerCase().includes(q);
      if (preSelected) selectedTeams.add(team);

      const el = document.createElement('div');
      el.className    = 'team-opt' + (preSelected ? ' selected' : '');
      el.dataset.team = team;
      el.innerHTML = `
        <div class="team-opt-flag">${flag}</div>
        <div class="team-opt-name">${team}</div>
        <div class="team-opt-grp">${I18n.t('group_prefix')} ${grp}</div>
        <div class="team-opt-check">${preSelected ? '✓' : ''}</div>`;
      el.onclick = () => toggle(el, team);
      g.appendChild(el);
    });

    updateBtn();
    document.getElementById('exportModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('exportModal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function handleOverlay(e) {
    if (e.target === document.getElementById('exportModal')) close();
  }

  function toggle(el, team) {
    if (selectedTeams.has(team)) {
      selectedTeams.delete(team);
      el.classList.remove('selected');
      el.querySelector('.team-opt-check').textContent = '';
    } else {
      selectedTeams.add(team);
      el.classList.add('selected');
      el.querySelector('.team-opt-check').textContent = '✓';
    }
    allSelected = selectedTeams.size === WC2026.teams.length;
    document.getElementById('selectAllBtn').textContent =
      allSelected ? I18n.t('deselect_all') : I18n.t('select_all');
    updateBtn();
  }

  function toggleAll() {
    const opts = document.querySelectorAll('.team-opt');
    if (!allSelected) {
      WC2026.teams.forEach(t => selectedTeams.add(t));
      opts.forEach(el => { el.classList.add('selected'); el.querySelector('.team-opt-check').textContent = '✓'; });
      allSelected = true;
      document.getElementById('selectAllBtn').textContent = I18n.t('deselect_all');
    } else {
      selectedTeams.clear();
      opts.forEach(el => { el.classList.remove('selected'); el.querySelector('.team-opt-check').textContent = ''; });
      allSelected = false;
      document.getElementById('selectAllBtn').textContent = I18n.t('select_all');
    }
    updateBtn();
  }

  function updateBtn() {
    const btn      = document.getElementById('downloadBtn');
    const teamList = [...selectedTeams];
    btn.disabled   = selectedTeams.size === 0;
    if (selectedTeams.size === 0)                           btn.textContent = I18n.t('download_ics');
    else if (allSelected)                                   btn.textContent = I18n.t('download_all');
    else if (teamList.length === 1)                         btn.textContent = I18n.t('download_1_team', { team: teamList[0] });
    else                                                    btn.textContent = I18n.t('download_n_teams', { n: teamList.length });
  }

  function download() {
    const teamList = [...selectedTeams];
    const seen = new Set();
    const matches = WC2026.FIXTURES.filter(f => {
      if (f.stage !== 'group') return false;
      const involves = f.teams.some(t => teamList.includes(t));
      const key = `${f.id}`;
      if (involves && !seen.has(key)) { seen.add(key); return true; }
      return false;
    });

    const ics  = buildICS(matches, teamList);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = teamList.length === 1
      ? `wc2026-${teamList[0].replace(/\s+/g,'-')}.ics`
      : teamList.length === WC2026.teams.length ? 'wc2026-all-matches.ics' : 'wc2026-selected-teams.ics';
    a.click();
    URL.revokeObjectURL(url);

    const btn  = document.getElementById('downloadBtn');
    const orig = btn.textContent;
    btn.textContent = I18n.t('downloaded');
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }

  return { open, close, handleOverlay, toggleAll, download };
})();
