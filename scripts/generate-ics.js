/**
 * scripts/generate-ics.js
 *
 * Generates /ics/<team-slug>.ics for every team + /ics/all.ics
 * Run by GitHub Actions after every score fetch.
 *
 * How it works
 * ──────────────
 * • Reads fixture data (hard-coded from data.js) and the live matches.json
 * • For each team: group-stage matches (confirmed) + all knockout matches
 *   where the team appears in homeDesc/awayDesc (tentative) or is confirmed
 *   by live results (confirmed, SEQUENCE:1).
 * • Writes files to /ics/ directory which is served by GitHub Pages.
 * • Calendar apps subscribe to webcal://chyfarhanjamil.github.io/wc2026-fixture/ics/<team>.ics
 *   and automatically poll/refresh daily to pick up confirmed team names.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Fixture data (mirrored from data.js) ─────────────────────────────────────
// Group stage only needs home/away/utc/venue/group.
// KO stage needs home/away/utc/venue/homeDesc/awayDesc for tentative matching.

const FIXTURES_RAW = [
  // GROUP STAGE
  {id:1,  stage:'group',group:'A',home:'Mexico',              away:'South Africa',         utc:'2026-06-11T19:00:00Z',venue:'Mexico City'},
  {id:2,  stage:'group',group:'A',home:'Korea Republic',      away:'Czechia',              utc:'2026-06-12T02:00:00Z',venue:'Guadalajara'},
  {id:3,  stage:'group',group:'B',home:'Canada',              away:'Bosnia & Herzegovina', utc:'2026-06-12T19:00:00Z',venue:'Toronto'},
  {id:4,  stage:'group',group:'D',home:'USA',                 away:'Paraguay',             utc:'2026-06-13T01:00:00Z',venue:'Los Angeles'},
  {id:5,  stage:'group',group:'B',home:'Qatar',               away:'Switzerland',          utc:'2026-06-13T19:00:00Z',venue:'San Francisco'},
  {id:6,  stage:'group',group:'C',home:'Brazil',              away:'Morocco',              utc:'2026-06-13T22:00:00Z',venue:'New York/NJ'},
  {id:7,  stage:'group',group:'C',home:'Haiti',               away:'Scotland',             utc:'2026-06-14T01:00:00Z',venue:'Boston'},
  {id:8,  stage:'group',group:'D',home:'Australia',           away:'Türkiye',              utc:'2026-06-14T04:00:00Z',venue:'Vancouver'},
  {id:9,  stage:'group',group:'E',home:'Germany',             away:'Curaçao',              utc:'2026-06-14T17:00:00Z',venue:'Houston'},
  {id:10, stage:'group',group:'F',home:'Netherlands',         away:'Japan',                utc:'2026-06-14T20:00:00Z',venue:'Los Angeles'},
  {id:11, stage:'group',group:'E',home:'Ecuador',             away:'Ivory Coast',          utc:'2026-06-14T23:00:00Z',venue:'Seattle'},
  {id:12, stage:'group',group:'F',home:'Sweden',              away:'Tunisia',              utc:'2026-06-15T01:30:00Z',venue:'Dallas'},
  {id:13, stage:'group',group:'G',home:'Belgium',             away:'Egypt',                utc:'2026-06-15T17:00:00Z',venue:'Kansas City'},
  {id:14, stage:'group',group:'H',home:'Spain',               away:'Uruguay',              utc:'2026-06-15T20:00:00Z',venue:'Atlanta'},
  {id:15, stage:'group',group:'G',home:'Iran',                away:'New Zealand',          utc:'2026-06-15T23:00:00Z',venue:'San Francisco'},
  {id:16, stage:'group',group:'H',home:'Saudi Arabia',        away:'Cabo Verde',           utc:'2026-06-16T01:30:00Z',venue:'Boston'},
  {id:17, stage:'group',group:'I',home:'France',              away:'Senegal',              utc:'2026-06-16T17:00:00Z',venue:'Los Angeles'},
  {id:18, stage:'group',group:'J',home:'Argentina',           away:'Algeria',              utc:'2026-06-16T20:00:00Z',venue:'Dallas'},
  {id:19, stage:'group',group:'I',home:'Norway',              away:'Iraq',                 utc:'2026-06-16T23:00:00Z',venue:'Philadelphia'},
  {id:20, stage:'group',group:'J',home:'Austria',             away:'Jordan',               utc:'2026-06-17T01:30:00Z',venue:'Miami'},
  {id:21, stage:'group',group:'K',home:'Portugal',            away:'Uzbekistan',           utc:'2026-06-17T17:00:00Z',venue:'Kansas City'},
  {id:22, stage:'group',group:'L',home:'England',             away:'Croatia',              utc:'2026-06-17T20:00:00Z',venue:'New York/NJ'},
  {id:23, stage:'group',group:'K',home:'Colombia',            away:'Congo DR',             utc:'2026-06-17T23:00:00Z',venue:'Houston'},
  {id:24, stage:'group',group:'L',home:'Ghana',               away:'Panama',               utc:'2026-06-18T01:30:00Z',venue:'Seattle'},
  {id:25, stage:'group',group:'A',home:'South Africa',        away:'Czechia',              utc:'2026-06-18T17:00:00Z',venue:'Los Angeles'},
  {id:26, stage:'group',group:'B',home:'Canada',              away:'Qatar',                utc:'2026-06-18T20:00:00Z',venue:'Boston'},
  {id:27, stage:'group',group:'A',home:'Mexico',              away:'Korea Republic',       utc:'2026-06-18T23:00:00Z',venue:'San Francisco'},
  {id:28, stage:'group',group:'B',home:'Switzerland',         away:'Bosnia & Herzegovina', utc:'2026-06-19T01:30:00Z',venue:'Vancouver'},
  {id:29, stage:'group',group:'D',home:'USA',                 away:'Australia',            utc:'2026-06-19T17:00:00Z',venue:'New York/NJ'},
  {id:30, stage:'group',group:'C',home:'Morocco',             away:'Haiti',                utc:'2026-06-19T20:00:00Z',venue:'Guadalajara'},
  {id:31, stage:'group',group:'D',home:'Türkiye',             away:'Paraguay',             utc:'2026-06-19T23:00:00Z',venue:'Kansas City'},
  {id:32, stage:'group',group:'C',home:'Brazil',              away:'Scotland',             utc:'2026-06-20T01:30:00Z',venue:'Houston'},
  {id:33, stage:'group',group:'G',home:'Belgium',             away:'Iran',                 utc:'2026-06-20T17:00:00Z',venue:'Dallas'},
  {id:34, stage:'group',group:'E',home:'Germany',             away:'Ecuador',              utc:'2026-06-20T20:00:00Z',venue:'Philadelphia'},
  {id:35, stage:'group',group:'F',home:'Japan',               away:'Sweden',               utc:'2026-06-20T23:00:00Z',venue:'Miami'},
  {id:36, stage:'group',group:'E',home:'Ivory Coast',         away:'Curaçao',              utc:'2026-06-21T01:30:00Z',venue:'Toronto'},
  {id:37, stage:'group',group:'H',home:'Spain',               away:'Saudi Arabia',         utc:'2026-06-21T17:00:00Z',venue:'Los Angeles'},
  {id:38, stage:'group',group:'F',home:'Netherlands',         away:'Tunisia',              utc:'2026-06-21T20:00:00Z',venue:'Atlanta'},
  {id:39, stage:'group',group:'G',home:'Egypt',               away:'New Zealand',          utc:'2026-06-21T23:00:00Z',venue:'Houston'},
  {id:40, stage:'group',group:'H',home:'Uruguay',             away:'Cabo Verde',           utc:'2026-06-22T01:30:00Z',venue:'Kansas City'},
  {id:41, stage:'group',group:'J',home:'Argentina',           away:'Austria',              utc:'2026-06-22T17:00:00Z',venue:'Boston'},
  {id:42, stage:'group',group:'I',home:'France',              away:'Norway',               utc:'2026-06-22T20:00:00Z',venue:'Seattle'},
  {id:43, stage:'group',group:'J',home:'Jordan',              away:'Algeria',              utc:'2026-06-22T23:00:00Z',venue:'Vancouver'},
  {id:44, stage:'group',group:'I',home:'Senegal',             away:'Iraq',                 utc:'2026-06-23T01:30:00Z',venue:'Philadelphia'},
  {id:45, stage:'group',group:'K',home:'Portugal',            away:'Colombia',             utc:'2026-06-23T17:00:00Z',venue:'Seattle'},
  {id:46, stage:'group',group:'L',home:'England',             away:'Ghana',                utc:'2026-06-23T20:00:00Z',venue:'Miami'},
  {id:47, stage:'group',group:'K',home:'Uzbekistan',          away:'Congo DR',             utc:'2026-06-23T23:00:00Z',venue:'San Francisco'},
  {id:48, stage:'group',group:'L',home:'Croatia',             away:'Panama',               utc:'2026-06-24T01:30:00Z',venue:'Los Angeles'},
  {id:49, stage:'group',group:'A',home:'Czechia',             away:'Korea Republic',       utc:'2026-06-24T20:00:00Z',venue:'Atlanta'},
  {id:50, stage:'group',group:'A',home:'Mexico',              away:'South Africa',         utc:'2026-06-24T20:00:00Z',venue:'Toronto'},
  {id:51, stage:'group',group:'B',home:'Switzerland',         away:'Canada',               utc:'2026-06-25T00:00:00Z',venue:'Dallas'},
  {id:52, stage:'group',group:'B',home:'Bosnia & Herzegovina',away:'Qatar',                utc:'2026-06-25T00:00:00Z',venue:'Houston'},
  {id:53, stage:'group',group:'C',home:'Morocco',             away:'Scotland',             utc:'2026-06-25T02:30:00Z',venue:'Seattle'},
  {id:54, stage:'group',group:'C',home:'Brazil',              away:'Haiti',                utc:'2026-06-25T02:30:00Z',venue:'Vancouver'},
  {id:55, stage:'group',group:'D',home:'USA',                 away:'Türkiye',              utc:'2026-06-25T19:00:00Z',venue:'Philadelphia'},
  {id:56, stage:'group',group:'D',home:'Paraguay',            away:'Australia',            utc:'2026-06-25T19:00:00Z',venue:'Miami'},
  {id:57, stage:'group',group:'E',home:'Germany',             away:'Ivory Coast',          utc:'2026-06-25T22:00:00Z',venue:'Boston'},
  {id:58, stage:'group',group:'E',home:'Ecuador',             away:'Curaçao',              utc:'2026-06-25T22:00:00Z',venue:'Guadalajara'},
  {id:59, stage:'group',group:'F',home:'Netherlands',         away:'Sweden',               utc:'2026-06-26T01:00:00Z',venue:'Kansas City'},
  {id:60, stage:'group',group:'F',home:'Japan',               away:'Tunisia',              utc:'2026-06-26T01:00:00Z',venue:'Atlanta'},
  {id:61, stage:'group',group:'I',home:'Norway',              away:'France',               utc:'2026-06-26T19:00:00Z',venue:'Boston'},
  {id:62, stage:'group',group:'I',home:'Senegal',             away:'Iraq',                 utc:'2026-06-26T19:00:00Z',venue:'Toronto'},
  {id:63, stage:'group',group:'H',home:'Uruguay',             away:'Spain',                utc:'2026-06-27T00:00:00Z',venue:'Guadalajara'},
  {id:64, stage:'group',group:'H',home:'Cabo Verde',          away:'Saudi Arabia',         utc:'2026-06-27T00:00:00Z',venue:'Houston'},
  {id:65, stage:'group',group:'G',home:'New Zealand',         away:'Belgium',              utc:'2026-06-27T03:00:00Z',venue:'Vancouver'},
  {id:66, stage:'group',group:'G',home:'Egypt',               away:'Iran',                 utc:'2026-06-27T03:00:00Z',venue:'Seattle'},
  {id:67, stage:'group',group:'L',home:'Panama',              away:'England',              utc:'2026-06-27T21:00:00Z',venue:'New York/NJ'},
  {id:68, stage:'group',group:'L',home:'Croatia',             away:'Ghana',                utc:'2026-06-27T21:00:00Z',venue:'Philadelphia'},
  {id:69, stage:'group',group:'K',home:'Colombia',            away:'Portugal',             utc:'2026-06-27T23:30:00Z',venue:'Miami'},
  {id:70, stage:'group',group:'K',home:'Congo DR',            away:'Uzbekistan',           utc:'2026-06-27T23:30:00Z',venue:'Atlanta'},
  {id:71, stage:'group',group:'J',home:'Argentina',           away:'Jordan',               utc:'2026-06-28T02:00:00Z',venue:'Dallas'},
  {id:72, stage:'group',group:'J',home:'Algeria',             away:'Austria',              utc:'2026-06-28T02:00:00Z',venue:'Kansas City'},

  // ROUND OF 32
  {id:73, stage:'r32',home:'2nd Group A',away:'2nd Group B',
    homeDesc:'Runner-up Group A (Mexico, Korea Republic, Czechia, South Africa)',
    awayDesc:'Runner-up Group B (Canada, Switzerland, Bosnia & Herzegovina, Qatar)',
    utc:'2026-06-28T19:00:00Z',venue:'Los Angeles'},
  {id:76, stage:'r32',home:'1st Group C',away:'2nd Group F',
    homeDesc:'Winner Group C (Brazil, Morocco, Haiti, Scotland)',
    awayDesc:'Runner-up Group F (Netherlands, Japan, Sweden, Tunisia)',
    utc:'2026-06-29T17:00:00Z',venue:'Houston'},
  {id:74, stage:'r32',home:'1st Group E',away:'Best 3rd (A/B/C/D/F)',
    homeDesc:'Winner Group E (Germany, Ivory Coast, Ecuador, Curaçao)',
    awayDesc:'Best 3rd from Groups A,B,C,D,F',
    utc:'2026-06-29T20:30:00Z',venue:'Boston'},
  {id:75, stage:'r32',home:'1st Group F',away:'2nd Group C',
    homeDesc:'Winner Group F (Netherlands, Japan, Sweden, Tunisia)',
    awayDesc:'Runner-up Group C (Brazil, Morocco, Haiti, Scotland)',
    utc:'2026-06-30T01:00:00Z',venue:'Monterrey'},
  {id:78, stage:'r32',home:'2nd Group E',away:'2nd Group I',
    homeDesc:'Runner-up Group E (Germany, Ivory Coast, Ecuador, Curaçao)',
    awayDesc:'Runner-up Group I (France, Norway, Iraq, Senegal)',
    utc:'2026-06-30T17:00:00Z',venue:'Dallas'},
  {id:77, stage:'r32',home:'1st Group I',away:'Best 3rd (C/D/F/G/H)',
    homeDesc:'Winner Group I (France, Norway, Iraq, Senegal)',
    awayDesc:'Best 3rd from Groups C,D,F,G,H',
    utc:'2026-06-30T21:00:00Z',venue:'New York/NJ'},
  {id:79, stage:'r32',home:'1st Group A',away:'Best 3rd (C/E/F/H/I)',
    homeDesc:'Winner Group A (Mexico, Korea Republic, Czechia, South Africa)',
    awayDesc:'Best 3rd from Groups C,E,F,H,I',
    utc:'2026-07-01T01:00:00Z',venue:'Mexico City'},
  {id:80, stage:'r32',home:'1st Group L',away:'Best 3rd (E/H/I/J/K)',
    homeDesc:'Winner Group L (England, Croatia, Ghana, Panama)',
    awayDesc:'Best 3rd from Groups E,H,I,J,K',
    utc:'2026-07-01T16:00:00Z',venue:'Atlanta'},
  {id:82, stage:'r32',home:'1st Group G',away:'Best 3rd (A/E/H/I/J)',
    homeDesc:'Winner Group G (Belgium, Iran, New Zealand, Egypt)',
    awayDesc:'Best 3rd from Groups A,E,H,I,J',
    utc:'2026-07-01T20:00:00Z',venue:'Seattle'},
  {id:81, stage:'r32',home:'1st Group D',away:'Best 3rd (B/E/F/I/J)',
    homeDesc:'Winner Group D (USA, Türkiye, Australia, Paraguay)',
    awayDesc:'Best 3rd from Groups B,E,F,I,J',
    utc:'2026-07-02T00:00:00Z',venue:'San Francisco'},
  {id:84, stage:'r32',home:'1st Group H',away:'2nd Group J',
    homeDesc:'Winner Group H (Spain, Uruguay, Saudi Arabia, Cabo Verde)',
    awayDesc:'Runner-up Group J (Argentina, Austria, Algeria, Jordan)',
    utc:'2026-07-02T19:00:00Z',venue:'Los Angeles'},
  {id:83, stage:'r32',home:'2nd Group K',away:'2nd Group L',
    homeDesc:'Runner-up Group K (Portugal, Colombia, Uzbekistan, Congo DR)',
    awayDesc:'Runner-up Group L (England, Croatia, Ghana, Panama)',
    utc:'2026-07-02T23:00:00Z',venue:'Toronto'},
  {id:85, stage:'r32',home:'1st Group B',away:'Best 3rd (E/F/G/I/J)',
    homeDesc:'Winner Group B (Canada, Switzerland, Bosnia & Herzegovina, Qatar)',
    awayDesc:'Best 3rd from Groups E,F,G,I,J',
    utc:'2026-07-03T03:00:00Z',venue:'Vancouver'},
  {id:88, stage:'r32',home:'2nd Group D',away:'2nd Group G',
    homeDesc:'Runner-up Group D (USA, Türkiye, Australia, Paraguay)',
    awayDesc:'Runner-up Group G (Belgium, Iran, New Zealand, Egypt)',
    utc:'2026-07-03T18:00:00Z',venue:'Dallas'},
  {id:86, stage:'r32',home:'1st Group J',away:'2nd Group H',
    homeDesc:'Winner Group J (Argentina, Austria, Algeria, Jordan)',
    awayDesc:'Runner-up Group H (Spain, Uruguay, Saudi Arabia, Cabo Verde)',
    utc:'2026-07-03T22:00:00Z',venue:'Miami'},
  {id:87, stage:'r32',home:'1st Group K',away:'Best 3rd (D/E/I/J/L)',
    homeDesc:'Winner Group K (Portugal, Colombia, Uzbekistan, Congo DR)',
    awayDesc:'Best 3rd from Groups D,E,I,J,L',
    utc:'2026-07-04T01:30:00Z',venue:'Kansas City'},

  // ROUND OF 16
  {id:90, stage:'r16',home:'Winner R32 Match 73',away:'Winner R32 Match 75',
    homeDesc:'Winner of R32: 2nd-A vs 2nd-B (Mexico, Korea Republic, Czechia, South Africa, Canada, Switzerland, Bosnia, Qatar)',
    awayDesc:'Winner of R32: 1st-F vs 2nd-C (Netherlands, Japan, Sweden, Tunisia, Brazil, Morocco, Haiti, Scotland)',
    utc:'2026-07-04T17:00:00Z',venue:'Houston'},
  {id:89, stage:'r16',home:'Winner R32 Match 74',away:'Winner R32 Match 77',
    homeDesc:'Winner of R32: 1st-E vs Best 3rd (Germany, Ivory Coast, Ecuador, Curaçao)',
    awayDesc:'Winner of R32: 1st-I vs Best 3rd (France, Norway, Iraq, Senegal)',
    utc:'2026-07-04T21:00:00Z',venue:'Philadelphia'},
  {id:91, stage:'r16',home:'Winner R32 Match 76',away:'Winner R32 Match 78',
    homeDesc:'Winner of R32: 1st-C vs 2nd-F (Brazil, Morocco, Haiti, Scotland, Netherlands, Japan, Sweden, Tunisia)',
    awayDesc:'Winner of R32: 2nd-E vs 2nd-I (Germany, Ivory Coast, Ecuador, France, Norway, Iraq, Senegal)',
    utc:'2026-07-05T19:00:00Z',venue:'New York/NJ'},
  {id:92, stage:'r16',home:'Winner R32 Match 79',away:'Winner R32 Match 80',
    homeDesc:'Winner of R32: 1st-A vs Best 3rd (Mexico, Korea Republic, Czechia, South Africa)',
    awayDesc:'Winner of R32: 1st-L vs Best 3rd (England, Croatia, Ghana, Panama)',
    utc:'2026-07-06T19:00:00Z',venue:'Mexico City'},
  {id:93, stage:'r16',home:'Winner R32 Match 83',away:'Winner R32 Match 84',
    homeDesc:'Winner of R32: 2nd-K vs 2nd-L (Portugal, Colombia, Uzbekistan, Congo DR, England, Croatia, Ghana, Panama)',
    awayDesc:'Winner of R32: 1st-H vs 2nd-J (Spain, Uruguay, Saudi Arabia, Cabo Verde, Argentina, Austria, Algeria, Jordan)',
    utc:'2026-07-06T22:00:00Z',venue:'Dallas'},
  {id:94, stage:'r16',home:'Winner R32 Match 81',away:'Winner R32 Match 82',
    homeDesc:'Winner of R32: 1st-D vs Best 3rd (USA, Türkiye, Australia, Paraguay)',
    awayDesc:'Winner of R32: 1st-G vs Best 3rd (Belgium, Iran, New Zealand, Egypt)',
    utc:'2026-07-07T17:00:00Z',venue:'Seattle'},
  {id:95, stage:'r16',home:'Winner R32 Match 86',away:'Winner R32 Match 88',
    homeDesc:'Winner of R32: 1st-J vs 2nd-H (Argentina, Austria, Algeria, Jordan, Spain, Uruguay, Saudi Arabia)',
    awayDesc:'Winner of R32: 2nd-D vs 2nd-G (USA, Türkiye, Australia, Paraguay, Belgium, Iran, Egypt)',
    utc:'2026-07-07T21:00:00Z',venue:'Atlanta'},
  {id:96, stage:'r16',home:'Winner R32 Match 85',away:'Winner R32 Match 87',
    homeDesc:'Winner of R32: 1st-B vs Best 3rd (Canada, Switzerland, Bosnia & Herzegovina, Qatar)',
    awayDesc:'Winner of R32: 1st-K vs Best 3rd (Portugal, Colombia, Uzbekistan, Congo DR)',
    utc:'2026-07-07T23:00:00Z',venue:'New York/NJ'},

  // QUARTER-FINALS
  {id:97, stage:'qf',home:'Winner R16 Match 89',away:'Winner R16 Match 90',
    homeDesc:'Winner of R16 (Germany, France, Brazil, Mexico, Netherlands)',
    awayDesc:'Winner of R16 (Mexico, Korea Republic, Canada, Brazil, Netherlands)',
    utc:'2026-07-09T19:00:00Z',venue:'Dallas'},
  {id:98, stage:'qf',home:'Winner R16 Match 93',away:'Winner R16 Match 94',
    homeDesc:'Winner of R16 (Spain, Argentina, Portugal, England, Uruguay)',
    awayDesc:'Winner of R16 (USA, Belgium, Iran)',
    utc:'2026-07-09T23:00:00Z',venue:'Los Angeles'},
  {id:99, stage:'qf',home:'Winner R16 Match 91',away:'Winner R16 Match 92',
    homeDesc:'Winner of R16 (Brazil, Morocco, Germany, Netherlands, France)',
    awayDesc:'Winner of R16 (Mexico, England)',
    utc:'2026-07-10T19:00:00Z',venue:'New York/NJ'},
  {id:100,stage:'qf',home:'Winner R16 Match 95',away:'Winner R16 Match 96',
    homeDesc:'Winner of R16 (Argentina, Spain, USA, Belgium)',
    awayDesc:'Winner of R16 (Portugal, Canada)',
    utc:'2026-07-11T01:00:00Z',venue:'Boston'},

  // SEMI-FINALS
  {id:101,stage:'sf',home:'Winner QF Match 97',away:'Winner QF Match 98',
    homeDesc:'Could include: Germany, France, Brazil, Mexico, Netherlands',
    awayDesc:'Could include: Spain, Argentina, Portugal, England, USA',
    utc:'2026-07-14T23:00:00Z',venue:'Dallas'},
  {id:102,stage:'sf',home:'Winner QF Match 99',away:'Winner QF Match 100',
    homeDesc:'Could include: Brazil, Germany, France, Morocco, England',
    awayDesc:'Could include: Argentina, Spain, Portugal, Belgium',
    utc:'2026-07-15T21:00:00Z',venue:'New York/NJ'},

  // 3RD PLACE
  {id:103,stage:'3rd',home:'Loser SF Match 101',away:'Loser SF Match 102',
    homeDesc:'Loser of Semi-Final 1 (Dallas)',
    awayDesc:'Loser of Semi-Final 2 (New York/NJ)',
    utc:'2026-07-18T19:00:00Z',venue:'Miami'},

  // FINAL
  {id:104,stage:'final',home:'Winner SF Match 101',away:'Winner SF Match 102',
    homeDesc:'Winner of Semi-Final 1',
    awayDesc:'Winner of Semi-Final 2',
    utc:'2026-07-19T19:00:00Z',venue:'New York/NJ'},
];

// Stage labels
const STAGE_LABELS = {
  group:'Group Stage', r32:'Round of 32', r16:'Round of 16',
  qf:'Quarter-Final', sf:'Semi-Final', '3rd':'3rd Place Play-off', final:'Final'
};

// All 48 teams (for generating per-team files)
const ALL_TEAMS = [
  'Mexico','South Africa','Korea Republic','Czechia',
  'Canada','Bosnia & Herzegovina','Qatar','Switzerland',
  'Brazil','Morocco','Haiti','Scotland',
  'USA','Türkiye','Australia','Paraguay',
  'Germany','Ivory Coast','Ecuador','Curaçao',
  'Netherlands','Japan','Sweden','Tunisia',
  'Belgium','Iran','New Zealand','Egypt',
  'Spain','Uruguay','Saudi Arabia','Cabo Verde',
  'France','Senegal','Iraq','Norway',
  'Argentina','Algeria','Austria','Jordan',
  'Portugal','Colombia','Uzbekistan','Congo DR',
  'England','Croatia','Ghana','Panama',
];

// ── Load live results from matches.json ───────────────────────────────────────

let liveResults = {}; // fixtureId → { homeScore, awayScore, status }

try {
  const matchesRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/matches.json'), 'utf8'));
  const matches = matchesRaw.matches || [];

  // Map by football-data.org id → our fixture id
  // The live.js module matches by utc time string — we do the same here
  const utcToId = {};
  FIXTURES_RAW.forEach(f => { utcToId[f.utc] = f.id; });

  matches.forEach(m => {
    if (!m.utcDate) return;
    // football-data.org uses format like "2026-06-13T22:00:00Z"
    const ourId = utcToId[m.utcDate];
    if (!ourId) return;
    if (m.status === 'FINISHED' && m.score?.fullTime) {
      liveResults[ourId] = {
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        status: 'FINISHED',
      };
    }
  });

  console.log(`Loaded live results for ${Object.keys(liveResults).length} finished matches`);
} catch (e) {
  console.warn('Could not load matches.json — generating without live results:', e.message);
}

// ── Resolver (simplified, mirrors resolver.js logic) ─────────────────────────

// Build group standings from finished group matches
const groupResults = {}; // groupLetter → { first, second, third }

function calcGroupStandings(letter) {
  const fixtures = FIXTURES_RAW.filter(f => f.stage === 'group' && f.group === letter);
  const finished = fixtures.filter(f => liveResults[f.id]);

  const teams = {};
  fixtures.forEach(f => {
    [f.home, f.away].forEach(t => {
      if (!teams[t]) teams[t] = { pts: 0, gd: 0, gf: 0 };
    });
  });

  const allFinished = fixtures.every(f => liveResults[f.id]);
  if (!allFinished) return null;

  finished.forEach(f => {
    const r = liveResults[f.id];
    const h = r.homeScore, a = r.awayScore;
    teams[f.home].gf += h; teams[f.home].gd += h - a;
    teams[f.away].gf += a; teams[f.away].gd += a - h;
    if (h > a)      { teams[f.home].pts += 3; }
    else if (h < a) { teams[f.away].pts += 3; }
    else            { teams[f.home].pts += 1; teams[f.away].pts += 1; }
  });

  const sorted = Object.entries(teams)
    .sort(([,a],[,b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .map(([team]) => team);

  return { first: sorted[0], second: sorted[1], third: sorted[2] };
}

['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(g => {
  groupResults[g] = calcGroupStandings(g);
});

// Resolve a KO fixture's home/away team names
// Returns { home, away, homeConfirmed, awayConfirmed }
function resolveKO(f) {
  function resolveSide(placeholder) {
    if (!placeholder) return null;

    // "1st Group C" / "2nd Group C"
    let m = placeholder.match(/^(1st|2nd) Group ([A-L])$/);
    if (m) {
      const g = groupResults[m[2]];
      if (!g) return null;
      return m[1] === '1st' ? g.first : g.second;
    }

    // "Winner R32 Match 73" etc.
    m = placeholder.match(/^Winner (?:R32|R16|QF|SF) Match (\d+)$/);
    if (m) {
      const matchId = parseInt(m[1]);
      const r = liveResults[matchId];
      if (!r || r.status !== 'FINISHED') return null;
      const src = FIXTURES_RAW.find(x => x.id === matchId);
      if (!src) return null;
      const srcResolved = src.stage !== 'group' ? resolveKO(src) : { home: src.home, away: src.away };
      return r.homeScore > r.awayScore ? srcResolved.home : srcResolved.away;
    }

    // "Loser SF Match 101"
    m = placeholder.match(/^Loser SF Match (\d+)$/);
    if (m) {
      const matchId = parseInt(m[1]);
      const r = liveResults[matchId];
      if (!r || r.status !== 'FINISHED') return null;
      const src = FIXTURES_RAW.find(x => x.id === matchId);
      if (!src) return null;
      const srcResolved = resolveKO(src);
      return r.homeScore > r.awayScore ? srcResolved.away : srcResolved.home;
    }

    return null; // Best 3rd — complex, skip for now
  }

  const home = resolveSide(f.home);
  const away = resolveSide(f.away);
  return { home: home || f.home, away: away || f.away, homeConfirmed: !!home, awayConfirmed: !!away };
}

// ── ICS helpers ───────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function toICS(utcStr, addHours = 0) {
  const d = new Date(new Date(utcStr).getTime() + addHours * 3600000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}` +
         `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

const NOW = toICS(new Date().toISOString());

function makeEvent(f, teamHint) {
  const isGroup = f.stage === 'group';
  let homeDisplay = f.home;
  let awayDisplay = f.away;
  let confirmed = true;

  if (!isGroup) {
    const r = resolveKO(f);
    homeDisplay = r.home;
    awayDisplay = r.away;
    confirmed = r.homeConfirmed && r.awayConfirmed;
  }

  const stageLabel = STAGE_LABELS[f.stage] || f.stage;
  const isTentative = !confirmed;

  const summary = isTentative
    ? `⚽ [TBD] ${homeDisplay} vs ${awayDisplay} (${stageLabel})`
    : `⚽ ${homeDisplay} vs ${awayDisplay} (${stageLabel})`;

  const desc = isTentative
    ? `FIFA World Cup 2026\\n${stageLabel}\\nTeams: ${homeDisplay} vs ${awayDisplay}\\nVenue: ${f.venue}\\nAuto-updates when teams are confirmed.`
    : `FIFA World Cup 2026\\n${homeDisplay} vs ${awayDisplay}\\n${stageLabel}\\nVenue: ${f.venue}`;

  // SEQUENCE:1 once both teams confirmed — calendar apps use this to update
  const seq = confirmed ? 1 : 0;

  return [
    'BEGIN:VEVENT',
    `UID:wc2026-m${f.id}@wc2026fixtures`,
    `DTSTAMP:${NOW}`,
    `SEQUENCE:${seq}`,
    `DTSTART:${toICS(f.utc)}`,
    `DTEND:${toICS(f.utc, 2)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${f.venue}`,
    isTentative ? 'STATUS:TENTATIVE' : 'STATUS:CONFIRMED',
    'END:VEVENT',
  ].join('\r\n');
}

function buildCalendar(fixtures, calName) {
  const events = fixtures.map(f => makeEvent(f)).join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WC2026 Fixtures//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
    events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function slug(team) {
  return team.toLowerCase()
    .normalize('NFD')                    // decompose accented chars: ü → u + combining
    .replace(/[\u0300-\u036f]/g, '')   // strip the combining diacritics
    .replace(/[^a-z0-9\s\-]/g, '')     // strip anything non-alphanum
    .trim()
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

// ── Check if a KO fixture may involve a given team ────────────────────────────

function koMayInvolve(f, team) {
  const r = resolveKO(f);
  if (r.homeConfirmed && r.home === team) return true;
  if (r.awayConfirmed && r.away === team) return true;
  // If not confirmed yet, check pool descriptions
  const tl = team.toLowerCase();
  if (!r.homeConfirmed && f.homeDesc && f.homeDesc.toLowerCase().includes(tl)) return true;
  if (!r.awayConfirmed && f.awayDesc && f.awayDesc.toLowerCase().includes(tl)) return true;
  return false;
}

// ── Generate files ─────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '../ics');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Per-team ICS
ALL_TEAMS.forEach(team => {
  const groupMatches = FIXTURES_RAW.filter(f =>
    f.stage === 'group' && (f.home === team || f.away === team)
  );
  const koMatches = FIXTURES_RAW.filter(f =>
    f.stage !== 'group' && koMayInvolve(f, team)
  );

  const fixtures = [...groupMatches, ...koMatches];
  const ics = buildCalendar(fixtures, `FIFA World Cup 2026 – ${team}`);
  const file = path.join(outDir, `${slug(team)}.ics`);
  fs.writeFileSync(file, ics, 'utf8');
  console.log(`  ${slug(team)}.ics  (${groupMatches.length} group + ${koMatches.length} KO matches)`);
});

// All-matches ICS
const allICS = buildCalendar(FIXTURES_RAW, 'FIFA World Cup 2026 – All Matches');
fs.writeFileSync(path.join(outDir, 'all.ics'), allICS, 'utf8');

console.log(`\n✓ Generated ${ALL_TEAMS.length + 1} ICS files in /ics/`);
