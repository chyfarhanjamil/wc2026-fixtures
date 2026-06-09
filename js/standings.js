/**
 * standings.js — Group standings (i18n-aware)
 */
'use strict';

const Standings = (() => {

  function calcGroup(groupLetter) {
    const fixtures = WC2026.FIXTURES.filter(f =>
      f.stage === 'group' && f.group === groupLetter);
    const rows = {};
    fixtures.forEach(f => {
      [f.home, f.away].forEach(t => {
        if (!rows[t]) rows[t] = { team:t, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
      });
    });
    fixtures.forEach(f => {
      const ld = Live.forFixture(f);
      if (!ld || ld.scoreHome === null || ld.status === 'SCHEDULED' || ld.status === 'TIMED') return;
      const hg = ld.scoreHome, ag = ld.scoreAway;
      const h = rows[f.home], a = rows[f.away];
      h.p++; a.p++;
      h.gf += hg; h.ga += ag;
      a.gf += ag; a.ga += hg;
      if (hg > ag)      { h.w++; h.pts+=3; a.l++; }
      else if (hg < ag) { a.w++; a.pts+=3; h.l++; }
      else              { h.d++; h.pts++; a.d++; a.pts++; }
    });
    Object.values(rows).forEach(r => r.gd = r.gf - r.ga);
    return Object.values(rows).sort((a,b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  }

  function renderTable(groupLetter) {
    const rows = calcGroup(groupLetter);
    const allFixtures = WC2026.FIXTURES.filter(f => f.stage === 'group' && f.group === groupLetter);
    const played = allFixtures.filter(f => {
      const ld = Live.forFixture(f);
      return ld && ld.scoreHome !== null && ld.status !== 'SCHEDULED' && ld.status !== 'TIMED';
    }).length;
    const rankIcon = ['🥇','🥈','🥉',''];

    let html = `
      <div class="standings-table-wrap">
        <div class="standings-group-title">
          ${I18n.t('group_prefix')} ${groupLetter}
          <span class="standings-progress">${played}/${allFixtures.length} ${I18n.t('standings_col_p').toLowerCase()}</span>
        </div>
        <table class="standings-table">
          <thead>
            <tr>
              <th class="col-pos">#</th>
              <th class="col-team">${I18n.t('mode_teams')}</th>
              <th title="${I18n.t('standings_col_p')}">${I18n.t('standings_col_p')}</th>
              <th title="${I18n.t('standings_col_w')}">${I18n.t('standings_col_w')}</th>
              <th title="${I18n.t('standings_col_d')}">${I18n.t('standings_col_d')}</th>
              <th title="${I18n.t('standings_col_l')}">${I18n.t('standings_col_l')}</th>
              <th title="GF">GF</th>
              <th title="GA">GA</th>
              <th title="${I18n.t('standings_col_gd')}">${I18n.t('standings_col_gd')}</th>
              <th title="${I18n.t('standings_col_pts')}">${I18n.t('standings_col_pts')}</th>
            </tr>
          </thead>
          <tbody>`;

    rows.forEach((r, i) => {
      const flag = WC2026.FLAGS[r.team] || '🏳️';
      const pos  = i + 1;
      const qual = pos <= 2 ? 'standing-qual' : pos === 3 ? 'standing-third' : '';
      const icon = rankIcon[i] || '';
      html += `
            <tr class="standing-row ${qual}">
              <td class="col-pos">${icon || pos}</td>
              <td class="col-team">
                <span class="standing-flag">${flag}</span>
                <span class="standing-name">${r.team}</span>
              </td>
              <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
              <td>${r.gf}</td><td>${r.ga}</td>
              <td class="${r.gd>0?'pos-gd':r.gd<0?'neg-gd':''}">${r.gd>0?'+'+r.gd:r.gd}</td>
              <td class="col-pts"><strong>${r.pts}</strong></td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
  }

  function renderAll(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = `<div class="standings-header">
      <h2 class="standings-title">${I18n.t('standings_title')}</h2>
    </div>
    <div class="standings-grid">`;
    WC2026.groups.forEach(g => { html += renderTable(g); });
    html += `</div>`;
    el.innerHTML = html;
  }

  return { calcGroup, renderAll, renderTable };
})();
