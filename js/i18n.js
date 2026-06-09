/**
 * i18n.js — Internationalisation module
 * Provides translations for all UI strings in 8 languages.
 * Usage: I18n.t('key')  →  translated string
 *        I18n.setLang('bn')  →  switch language + re-render
 */

'use strict';

const I18n = (() => {

  /* ── Language metadata ─────────────────────────────────────────────────── */
  const LANGUAGES = [
    { id: 'en',  label: 'English',    nativeLabel: 'English',    dir: 'ltr', flag: '🇬🇧' },
    { id: 'bn',  label: 'Bangla',     nativeLabel: 'বাংলা',      dir: 'ltr', flag: '🇧🇩' },
    { id: 'hi',  label: 'Hindi',      nativeLabel: 'हिन्दी',      dir: 'ltr', flag: '🇮🇳' },
    { id: 'fr',  label: 'French',     nativeLabel: 'Français',   dir: 'ltr', flag: '🇫🇷' },
    { id: 'de',  label: 'Deutsch',    nativeLabel: 'Deutsch',    dir: 'ltr', flag: '🇩🇪' },
    { id: 'es',  label: 'Spanish',    nativeLabel: 'Español',    dir: 'ltr', flag: '🇪🇸' },
    { id: 'pt',  label: 'Portuguese', nativeLabel: 'Português',  dir: 'ltr', flag: '🇧🇷' },
    { id: 'ar',  label: 'Arabic',     nativeLabel: 'العربية',    dir: 'rtl', flag: '🇸🇦' },
  ];

  /* ── Translation table ─────────────────────────────────────────────────── */
  const STRINGS = {

    /* Header */
    header_title: {
      en: '⚽ FIFA WORLD CUP 2026',
      bn: '⚽ ফিফা বিশ্বকাপ ২০২৬',
      hi: '⚽ फीफा विश्व कप 2026',
      fr: '⚽ FIFA COUPE DU MONDE 2026',
      de: '⚽ FIFA WELTMEISTERSCHAFT 2026',
      es: '⚽ FIFA COPA MUNDIAL 2026',
      pt: '⚽ FIFA COPA DO MUNDO 2026',
      ar: '⚽ كأس العالم فيفا 2026',
    },
    header_sub: {
      en: 'All 104 Matches · Group Stage to Final · {tz}',
      bn: 'সকল ১০৪ ম্যাচ · গ্রুপ পর্যায় থেকে ফাইনাল · {tz}',
      hi: 'सभी 104 मैच · ग्रुप स्टेज से फाइनल तक · {tz}',
      fr: '104 matchs au total · Phase de groupes à la Finale · {tz}',
      de: 'Alle 104 Spiele · Gruppenphase bis Finale · {tz}',
      es: '104 partidos · Fase de grupos hasta la Final · {tz}',
      pt: 'Todos os 104 jogos · Fase de grupos até a Final · {tz}',
      ar: 'جميع ١٠٤ مباريات · من دور المجموعات إلى النهائي · {tz}',
    },

    /* Search */
    search_placeholder: {
      en: 'Search team (e.g. Brazil, France, USA…)',
      bn: 'দল খুঁজুন (যেমন: ব্রাজিল, ফ্রান্স, আমেরিকা…)',
      hi: 'टीम खोजें (जैसे: ब्राज़ील, फ्रांस, अमेरिका…)',
      fr: 'Rechercher une équipe (ex. Brésil, France, USA…)',
      de: 'Team suchen (z.B. Brasilien, Frankreich, USA…)',
      es: 'Buscar equipo (ej. Brasil, Francia, EE.UU.…)',
      pt: 'Buscar equipe (ex. Brasil, França, EUA…)',
      ar: 'ابحث عن فريق (مثل: البرازيل، فرنسا، الولايات المتحدة…)',
    },

    /* Timezone label */
    tz_label: {
      en: 'Timezone', bn: 'সময় অঞ্চল', hi: 'समय क्षेत्र',
      fr: 'Fuseau horaire', de: 'Zeitzone', es: 'Zona horaria',
      pt: 'Fuso horário', ar: 'المنطقة الزمنية',
    },

    /* Mode buttons */
    mode_teams: {
      en: 'By Team', bn: 'দলভিত্তিক', hi: 'टीम अनुसार',
      fr: 'Par équipe', de: 'Nach Team', es: 'Por equipo',
      pt: 'Por equipe', ar: 'حسب الفريق',
    },
    mode_group: {
      en: 'By Group', bn: 'গ্রুপভিত্তিক', hi: 'ग्रुप अनुसार',
      fr: 'Par groupe', de: 'Nach Gruppe', es: 'Por grupo',
      pt: 'Por grupo', ar: 'حسب المجموعة',
    },
    mode_time: {
      en: 'By Time', bn: 'সময়ভিত্তিক', hi: 'समय अनुसार',
      fr: 'Par horaire', de: 'Nach Zeit', es: 'Por horario',
      pt: 'Por horário', ar: 'حسب الوقت',
    },
    mode_calendar: {
      en: 'Calendar', bn: 'ক্যালেন্ডার', hi: 'कैलेंडर',
      fr: 'Calendrier', de: 'Kalender', es: 'Calendario',
      pt: 'Calendário', ar: 'التقويم',
    },
    mode_knockout: {
      en: 'Knockout', bn: 'নকআউট', hi: 'नॉकआउट',
      fr: 'Élimination', de: 'KO-Runde', es: 'Eliminatoria',
      pt: 'Eliminatória', ar: 'الإقصاء',
    },

    /* Group filter */
    all_groups: {
      en: 'All Groups', bn: 'সব গ্রুপ', hi: 'सभी ग्रुप',
      fr: 'Tous les groupes', de: 'Alle Gruppen', es: 'Todos los grupos',
      pt: 'Todos os grupos', ar: 'جميع المجموعات',
    },
    group_prefix: {
      en: 'Group', bn: 'গ্রুপ', hi: 'ग्रुप',
      fr: 'Groupe', de: 'Gruppe', es: 'Grupo',
      pt: 'Grupo', ar: 'مجموعة',
    },

    /* Time slots */
    all_times: {
      en: 'All Times', bn: 'সব সময়', hi: 'सभी समय',
      fr: 'Tous les horaires', de: 'Alle Zeiten', es: 'Todos los horarios',
      pt: 'Todos os horários', ar: 'جميع الأوقات',
    },
    slot_early: {
      en: 'Early Morning (12AM–6AM)', bn: 'ভোররাত (রাত ১২টা–ভোর ৬টা)', hi: 'तड़के (12AM–6AM)',
      fr: 'Petit matin (0h–6h)', de: 'Früh (0–6 Uhr)', es: 'Madrugada (0–6h)',
      pt: 'Madrugada (0h–6h)', ar: 'فجراً (12ص–6ص)',
    },
    slot_morning: {
      en: 'Morning (6AM–12PM)', bn: 'সকাল (ভোর ৬টা–দুপুর ১২টা)', hi: 'सुबह (6AM–12PM)',
      fr: 'Matin (6h–12h)', de: 'Morgen (6–12 Uhr)', es: 'Mañana (6h–12h)',
      pt: 'Manhã (6h–12h)', ar: 'صباحاً (6ص–12م)',
    },
    slot_afternoon: {
      en: 'Afternoon (12PM–6PM)', bn: 'বিকেল (দুপুর ১২টা–সন্ধ্যা ৬টা)', hi: 'दोपहर (12PM–6PM)',
      fr: 'Après-midi (12h–18h)', de: 'Nachmittag (12–18 Uhr)', es: 'Tarde (12h–18h)',
      pt: 'Tarde (12h–18h)', ar: 'بعد الظهر (12م–6م)',
    },
    slot_evening: {
      en: 'Evening/Night (6PM–12AM)', bn: 'সন্ধ্যা/রাত (সন্ধ্যা ৬টা–রাত ১২টা)', hi: 'शाम/रात (6PM–12AM)',
      fr: 'Soir/Nuit (18h–0h)', de: 'Abend/Nacht (18–0 Uhr)', es: 'Tarde/Noche (18h–0h)',
      pt: 'Noite (18h–0h)', ar: 'مساءً/ليلاً (6م–12م)',
    },

    /* Team card */
    matches_count: {
      en: '{n} matches', bn: '{n}টি ম্যাচ', hi: '{n} मैच',
      fr: '{n} matchs', de: '{n} Spiele', es: '{n} partidos',
      pt: '{n} jogos', ar: '{n} مباريات',
    },
    vs: {
      en: 'vs', bn: 'বনাম', hi: 'बनाम',
      fr: 'c.', de: 'vs', es: 'vs',
      pt: 'vs', ar: 'ضد',
    },
    no_team_found: {
      en: 'No team found matching "{q}".', bn: '"{q}" এর সাথে কোনো দল পাওয়া যায়নি।', hi: '"{q}" से कोई टीम नहीं मिली।',
      fr: 'Aucune équipe correspondant à «{q}».', de: 'Kein Team für „{q}" gefunden.', es: 'No se encontró equipo para "{q}".',
      pt: 'Nenhuma equipe encontrada para "{q}".', ar: 'لا توجد فرق تطابق "{q}".',
    },
    no_teams_filter: {
      en: 'No teams match current filters.', bn: 'বর্তমান ফিল্টারে কোনো দল নেই।', hi: 'वर्तमान फ़िल्टर से कोई टीम नहीं मिली।',
      fr: 'Aucune équipe pour ces filtres.', de: 'Keine Teams für aktuelle Filter.', es: 'No hay equipos para los filtros actuales.',
      pt: 'Nenhuma equipe corresponde aos filtros.', ar: 'لا توجد فرق تطابق الفلاتر الحالية.',
    },
    no_slot_matches: {
      en: 'No {slot} matches for {team}. They play in: {slots}.', bn: '{team} এর {slot} সময়ে কোনো ম্যাচ নেই। তারা খেলে: {slots}।', hi: '{team} का {slot} में कोई मैच नहीं। वे खेलते हैं: {slots}।',
      fr: 'Pas de match {slot} pour {team}. Ils jouent : {slots}.', de: 'Keine {slot}-Spiele für {team}. Sie spielen in: {slots}.', es: 'No hay partidos {slot} para {team}. Juegan en: {slots}.',
      pt: 'Sem jogos {slot} para {team}. Eles jogam em: {slots}.', ar: 'لا مباريات {slot} لـ {team}. يلعبون في: {slots}.',
    },

    /* Calendar */
    cal_match: {
      en: '{n} match', bn: '{n}টি ম্যাচ', hi: '{n} मैच',
      fr: '{n} match', de: '{n} Spiel', es: '{n} partido',
      pt: '{n} jogo', ar: '{n} مباراة',
    },
    cal_matches: {
      en: '{n} matches', bn: '{n}টি ম্যাচ', hi: '{n} मैच',
      fr: '{n} matchs', de: '{n} Spiele', es: '{n} partidos',
      pt: '{n} jogos', ar: '{n} مباريات',
    },
    cal_day_header: {
      en: 'All matches on {date}', bn: '{date} তারিখের সকল ম্যাচ', hi: '{date} के सभी मैच',
      fr: 'Tous les matchs du {date}', de: 'Alle Spiele am {date}', es: 'Todos los partidos del {date}',
      pt: 'Todos os jogos em {date}', ar: 'جميع المباريات في {date}',
    },
    cal_day_header_q: {
      en: 'Matches on {date} matching "{q}"', bn: '{date} তারিখে "{q}" সম্পর্কিত ম্যাচ', hi: '{date} पर "{q}" के मैच',
      fr: 'Matchs du {date} correspondant à «{q}»', de: 'Spiele am {date} für „{q}"', es: 'Partidos del {date} para "{q}"',
      pt: 'Jogos em {date} para "{q}"', ar: 'مباريات {date} المطابقة لـ "{q}"',
    },
    cal_no_match: {
      en: 'No matches for "{q}" on {date}', bn: '{date} তারিখে "{q}" এর কোনো ম্যাচ নেই', hi: '{date} को "{q}" के कोई मैच नहीं',
      fr: 'Pas de match pour «{q}» le {date}', de: 'Keine Spiele für „{q}" am {date}', es: 'No hay partidos para "{q}" el {date}',
      pt: 'Sem jogos para "{q}" em {date}', ar: 'لا مباريات لـ "{q}" في {date}',
    },
    cal_other_matches: {
      en: 'Other matches for this search:', bn: 'এই অনুসন্ধানের অন্য ম্যাচগুলো:', hi: 'इस खोज के अन्य मैच:',
      fr: 'Autres matchs pour cette recherche :', de: 'Weitere Spiele für diese Suche:', es: 'Otros partidos para esta búsqueda:',
      pt: 'Outros jogos para esta busca:', ar: 'مباريات أخرى لهذا البحث:',
    },
    cal_no_results: {
      en: 'No matches found.', bn: 'কোনো ম্যাচ পাওয়া যায়নি।', hi: 'कोई मैच नहीं मिला।',
      fr: 'Aucun match trouvé.', de: 'Keine Spiele gefunden.', es: 'No se encontraron partidos.',
      pt: 'Nenhum jogo encontrado.', ar: 'لم يتم العثور على مباريات.',
    },

    /* Day names (short) */
    day_sun: { en:'Sun', bn:'রবি', hi:'रवि', fr:'Dim', de:'So', es:'Dom', pt:'Dom', ar:'أحد' },
    day_mon: { en:'Mon', bn:'সোম', hi:'सोम', fr:'Lun', de:'Mo', es:'Lun', pt:'Seg', ar:'اثنين' },
    day_tue: { en:'Tue', bn:'মঙ্গল', hi:'मंगल', fr:'Mar', de:'Di', es:'Mar', pt:'Ter', ar:'ثلاثاء' },
    day_wed: { en:'Wed', bn:'বুধ', hi:'बुध', fr:'Mer', de:'Mi', es:'Mié', pt:'Qua', ar:'أربعاء' },
    day_thu: { en:'Thu', bn:'বৃহস্প', hi:'गुरु', fr:'Jeu', de:'Do', es:'Jue', pt:'Qui', ar:'خميس' },
    day_fri: { en:'Fri', bn:'শুক্র', hi:'शुक्र', fr:'Ven', de:'Fr', es:'Vie', pt:'Sex', ar:'جمعة' },
    day_sat: { en:'Sat', bn:'শনি', hi:'शनि', fr:'Sam', de:'Sa', es:'Sáb', pt:'Sáb', ar:'سبت' },

    /* Month names */
    month_jan: { en:'January',   bn:'জানুয়ারি', hi:'जनवरी',   fr:'Janvier',   de:'Januar',   es:'Enero',      pt:'Janeiro',   ar:'يناير'   },
    month_feb: { en:'February',  bn:'ফেব্রুয়ারি', hi:'फरवरी',  fr:'Février',   de:'Februar',  es:'Febrero',    pt:'Fevereiro', ar:'فبراير'  },
    month_mar: { en:'March',     bn:'মার্চ',      hi:'मार्च',   fr:'Mars',      de:'März',     es:'Marzo',      pt:'Março',     ar:'مارس'    },
    month_apr: { en:'April',     bn:'এপ্রিল',     hi:'अप्रैल', fr:'Avril',     de:'April',    es:'Abril',      pt:'Abril',     ar:'أبريل'   },
    month_may: { en:'May',       bn:'মে',         hi:'मई',     fr:'Mai',       de:'Mai',      es:'Mayo',       pt:'Maio',      ar:'مايو'    },
    month_jun: { en:'June',      bn:'জুন',        hi:'जून',    fr:'Juin',      de:'Juni',     es:'Junio',      pt:'Junho',     ar:'يونيو'   },
    month_jul: { en:'July',      bn:'জুলাই',      hi:'जुलाई',  fr:'Juillet',   de:'Juli',     es:'Julio',      pt:'Julho',     ar:'يوليو'   },
    month_aug: { en:'August',    bn:'আগস্ট',      hi:'अगस्त',  fr:'Août',      de:'August',   es:'Agosto',     pt:'Agosto',    ar:'أغسطس'   },
    month_sep: { en:'September', bn:'সেপ্টেম্বর', hi:'सितंबर', fr:'Septembre', de:'September',es:'Septiembre', pt:'Setembro',  ar:'سبتمبر'  },
    month_oct: { en:'October',   bn:'অক্টোবর',    hi:'अक्टूबर',fr:'Octobre',   de:'Oktober',  es:'Octubre',    pt:'Outubro',   ar:'أكتوبر'  },
    month_nov: { en:'November',  bn:'নভেম্বর',    hi:'नवंबर',  fr:'Novembre',  de:'November', es:'Noviembre',  pt:'Novembro',  ar:'نوفمبر'  },
    month_dec: { en:'December',  bn:'ডিসেম্বর',   hi:'दिसंबर', fr:'Décembre',  de:'Dezember', es:'Diciembre',  pt:'Dezembro',  ar:'ديسمبر'  },

    /* Month abbrevs (3-char) */
    month_jan_s: { en:'Jan', bn:'জানু', hi:'जन', fr:'Jan', de:'Jan', es:'Ene', pt:'Jan', ar:'يناير' },
    month_feb_s: { en:'Feb', bn:'ফেব', hi:'फर', fr:'Fév', de:'Feb', es:'Feb', pt:'Fev', ar:'فبراير' },
    month_mar_s: { en:'Mar', bn:'মার', hi:'मार', fr:'Mar', de:'Mär', es:'Mar', pt:'Mar', ar:'مارس' },
    month_apr_s: { en:'Apr', bn:'এপ্র', hi:'अप्र', fr:'Avr', de:'Apr', es:'Abr', pt:'Abr', ar:'أبريل' },
    month_may_s: { en:'May', bn:'মে', hi:'मई', fr:'Mai', de:'Mai', es:'May', pt:'Mai', ar:'مايو' },
    month_jun_s: { en:'Jun', bn:'জুন', hi:'जून', fr:'Jun', de:'Jun', es:'Jun', pt:'Jun', ar:'يونيو' },
    month_jul_s: { en:'Jul', bn:'জুলা', hi:'जुल', fr:'Jul', de:'Jul', es:'Jul', pt:'Jul', ar:'يوليو' },
    month_aug_s: { en:'Aug', bn:'আগ', hi:'अग', fr:'Aoû', de:'Aug', es:'Ago', pt:'Ago', ar:'أغسطس' },
    month_sep_s: { en:'Sep', bn:'সেপ', hi:'सित', fr:'Sep', de:'Sep', es:'Sep', pt:'Set', ar:'سبتمبر' },
    month_oct_s: { en:'Oct', bn:'অক্ট', hi:'अक्ट', fr:'Oct', de:'Okt', es:'Oct', pt:'Out', ar:'أكتوبر' },
    month_nov_s: { en:'Nov', bn:'নভে', hi:'नव', fr:'Nov', de:'Nov', es:'Nov', pt:'Nov', ar:'نوفمبر' },
    month_dec_s: { en:'Dec', bn:'ডিসে', hi:'दिस', fr:'Déc', de:'Dez', es:'Dic', pt:'Dez', ar:'ديسمبر' },

    /* Bracket */
    bracket_label_r32:   { en:'Round of 32',    bn:'রাউন্ড অব ৩২',  hi:'राउंड ऑफ 32',   fr:'Huitièmes',      de:'Runde der 32',  es:'Ronda de 32',     pt:'Rodada de 32',   ar:'دور الـ 32' },
    bracket_label_r16:   { en:'Round of 16',    bn:'রাউন্ড অব ১৬',  hi:'राउंड ऑफ 16',   fr:'Seizièmes',      de:'Runde der 16',  es:'Ronda de 16',     pt:'Rodada de 16',   ar:'دور الـ 16' },
    bracket_label_qf:    { en:'Quarter-Finals', bn:'কোয়ার্টার ফাইনাল', hi:'क्वार्टर-फाइनल', fr:'Quarts de finale', de:'Viertelfinale', es:'Cuartos de final', pt:'Quartas de final', ar:'ربع النهائي' },
    bracket_label_sf:    { en:'Semi-Finals',    bn:'সেমি-ফাইনাল',   hi:'सेमी-फाइनल',    fr:'Demi-finales',   de:'Halbfinale',    es:'Semifinales',     pt:'Semifinais',     ar:'نصف النهائي' },
    bracket_label_3rd:   { en:'3rd Place',      bn:'তৃতীয় স্থান',  hi:'तीसरा स्थान',   fr:'3ème place',     de:'Platz 3',       es:'3.er lugar',      pt:'3.º lugar',      ar:'المركز الثالث' },
    bracket_label_final: { en:'Final',          bn:'ফাইনাল',        hi:'फाइनल',         fr:'Finale',         de:'Finale',        es:'Final',           pt:'Final',          ar:'النهائي' },
    bracket_legend: {
      en: 'Hover any team slot to see qualifying group info.',
      bn: 'গ্রুপ তথ্য দেখতে যেকোনো দলের স্লটে হোভার করুন।',
      hi: 'ग्रुप जानकारी देखने के लिए किसी भी टीम स्लॉट पर होवर करें।',
      fr: 'Survolez un slot pour voir les infos du groupe qualifié.',
      de: 'Fahren Sie über einen Team-Slot für Gruppen-Infos.',
      es: 'Pase el cursor sobre un slot para ver el grupo clasificado.',
      pt: 'Passe o cursor em um slot para ver o grupo classificado.',
      ar: 'مرر المؤشر على أي مكان لرؤية معلومات المجموعة.',
    },
    knockout_bracket: {
      en: '🏆 Knockout Bracket', bn: '🏆 নকআউট ব্র্যাকেট', hi: '🏆 नॉकआउट ब्रैकेट',
      fr: '🏆 Tableau K.O.', de: '🏆 K.O.-Tableau', es: '🏆 Cuadro Eliminatorio',
      pt: '🏆 Chave Eliminatória', ar: '🏆 مرحلة الإقصاء',
    },

    /* Stage labels (fixture cards) */
    stage_group: { en:'Group Stage', bn:'গ্রুপ পর্যায়', hi:'ग्रुप स्टेज', fr:'Phase de groupes', de:'Gruppenphase', es:'Fase de grupos', pt:'Fase de grupos', ar:'دور المجموعات' },
    stage_r32:   { en:'Round of 32', bn:'রাউন্ড অব ৩২', hi:'राउंड ऑफ 32', fr:'Huitièmes', de:'Runde der 32', es:'Ronda de 32', pt:'Rodada de 32', ar:'دور الـ 32' },
    stage_r16:   { en:'Round of 16', bn:'রাউন্ড অব ১৬', hi:'राउंड ऑफ 16', fr:'Seizièmes', de:'Runde der 16', es:'Ronda de 16', pt:'Rodada de 16', ar:'دور الـ 16' },
    stage_qf:    { en:'Quarter-Final', bn:'কোয়ার্টার ফাইনাল', hi:'क्वार्टर-फाइनल', fr:'Quart de finale', de:'Viertelfinale', es:'Cuarto de final', pt:'Quarta de final', ar:'ربع النهائي' },
    stage_sf:    { en:'Semi-Final', bn:'সেমি-ফাইনাল', hi:'सेमी-फाइनल', fr:'Demi-finale', de:'Halbfinale', es:'Semifinal', pt:'Semifinal', ar:'نصف النهائي' },
    stage_3rd:   { en:'3rd Place', bn:'তৃতীয় স্থান', hi:'तीसरा स्थान', fr:'3ème place', de:'Platz 3', es:'3.er lugar', pt:'3.º lugar', ar:'المركز الثالث' },
    stage_final: { en:'Final', bn:'ফাইনাল', hi:'फाइनल', fr:'Finale', de:'Finale', es:'Final', pt:'Final', ar:'النهائي' },

    /* Export modal */
    export_btn: {
      en: '📲 Add to iPhone / Google Calendar',
      bn: '📲 আইফোন / গুগল ক্যালেন্ডারে যোগ করুন',
      hi: '📲 iPhone / Google Calendar में जोड़ें',
      fr: '📲 Ajouter à iPhone / Google Agenda',
      de: '📲 Zu iPhone / Google Kalender hinzufügen',
      es: '📲 Añadir a iPhone / Google Calendario',
      pt: '📲 Adicionar ao iPhone / Google Agenda',
      ar: '📲 إضافة إلى iPhone / تقويم Google',
    },
    export_title: {
      en: '📲 Export to Calendar', bn: '📲 ক্যালেন্ডারে এক্সপোর্ট করুন', hi: '📲 कैलेंडर में एक्सपोर्ट करें',
      fr: '📲 Exporter vers le calendrier', de: '📲 In Kalender exportieren', es: '📲 Exportar al calendario',
      pt: '📲 Exportar para o calendário', ar: '📲 تصدير إلى التقويم',
    },
    export_sub: {
      en: 'Choose teams to add their group-stage schedule to your calendar app.',
      bn: 'আপনার ক্যালেন্ডার অ্যাপে গ্রুপ পর্যায়ের সময়সূচি যোগ করতে দল বেছে নিন।',
      hi: 'अपने कैलेंडर ऐप में ग्रुप स्टेज शेड्यूल जोड़ने के लिए टीम चुनें।',
      fr: 'Choisissez des équipes pour ajouter leur calendrier à votre agenda.',
      de: 'Wählen Sie Teams, um ihren Gruppenspielplan hinzuzufügen.',
      es: 'Elija equipos para agregar su calendario de fase de grupos.',
      pt: 'Escolha equipes para adicionar à sua agenda.',
      ar: 'اختر الفرق لإضافة جدول دور المجموعات إلى تقويمك.',
    },
    select_teams_label: {
      en: 'Select Teams', bn: 'দল বেছে নিন', hi: 'टीम चुनें',
      fr: 'Sélectionner les équipes', de: 'Teams auswählen', es: 'Seleccionar equipos',
      pt: 'Selecionar equipes', ar: 'اختر الفرق',
    },
    select_all: {
      en: 'Select All', bn: 'সব নির্বাচন করুন', hi: 'सभी चुनें',
      fr: 'Tout sélectionner', de: 'Alle auswählen', es: 'Seleccionar todo',
      pt: 'Selecionar tudo', ar: 'اختر الكل',
    },
    deselect_all: {
      en: 'Deselect All', bn: 'সব বাতিল করুন', hi: 'सभी हटाएं',
      fr: 'Tout désélectionner', de: 'Alle abwählen', es: 'Deseleccionar todo',
      pt: 'Desmarcar tudo', ar: 'إلغاء تحديد الكل',
    },
    download_ics: {
      en: '⬇️ Download .ics', bn: '⬇️ .ics ডাউনলোড করুন', hi: '⬇️ .ics डाउनलोड करें',
      fr: '⬇️ Télécharger .ics', de: '⬇️ .ics herunterladen', es: '⬇️ Descargar .ics',
      pt: '⬇️ Baixar .ics', ar: '⬇️ تنزيل .ics',
    },
    downloaded: {
      en: '✅ Downloaded!', bn: '✅ ডাউনলোড হয়েছে!', hi: '✅ डाउनलोड हो गया!',
      fr: '✅ Téléchargé !', de: '✅ Heruntergeladen!', es: '✅ ¡Descargado!',
      pt: '✅ Baixado!', ar: '✅ تم التنزيل!',
    },
    ics_note_iphone: {
      en: '<strong>iPhone:</strong> Open the .ics file → tap "Add All" → appears in Calendar app.',
      bn: '<strong>আইফোন:</strong> .ics ফাইল খুলুন → "Add All" চাপুন → ক্যালেন্ডার অ্যাপে দেখা যাবে।',
      hi: '<strong>iPhone:</strong> .ics फ़ाइल खोलें → "Add All" टैप करें → Calendar ऐप में दिखेगा।',
      fr: '<strong>iPhone :</strong> Ouvrez le .ics → appuyez sur «Tout ajouter» → apparaît dans Calendrier.',
      de: '<strong>iPhone:</strong> .ics-Datei öffnen → „Alle hinzufügen" → erscheint in der Kalender-App.',
      es: '<strong>iPhone:</strong> Abra el .ics → toque "Agregar todo" → aparece en Calendario.',
      pt: '<strong>iPhone:</strong> Abra o .ics → toque em "Adicionar tudo" → aparece no app Calendário.',
      ar: '<strong>iPhone:</strong> افتح ملف .ics → اضغط "إضافة الكل" → يظهر في تطبيق التقويم.',
    },
    ics_note_google: {
      en: '<strong>Google:</strong> calendar.google.com → Settings → Import → upload file.',
      bn: '<strong>গুগল:</strong> calendar.google.com → সেটিংস → ইমপোর্ট → ফাইল আপলোড করুন।',
      hi: '<strong>Google:</strong> calendar.google.com → Settings → Import → फ़ाइल अपलोड करें।',
      fr: '<strong>Google :</strong> calendar.google.com → Paramètres → Importer → charger le fichier.',
      de: '<strong>Google:</strong> calendar.google.com → Einstellungen → Importieren → Datei hochladen.',
      es: '<strong>Google:</strong> calendar.google.com → Ajustes → Importar → subir archivo.',
      pt: '<strong>Google:</strong> calendar.google.com → Configurações → Importar → enviar arquivo.',
      ar: '<strong>Google:</strong> calendar.google.com → الإعدادات → استيراد → رفع الملف.',
    },

    /* Download label with team count */
    download_all: {
      en: '⬇️ Download All Matches .ics', bn: '⬇️ সব ম্যাচ .ics ডাউনলোড', hi: '⬇️ सभी मैच .ics डाउनलोड',
      fr: '⬇️ Télécharger tous les matchs .ics', de: '⬇️ Alle Spiele .ics laden', es: '⬇️ Descargar todos los partidos .ics',
      pt: '⬇️ Baixar todos os jogos .ics', ar: '⬇️ تنزيل جميع المباريات .ics',
    },
    download_n_teams: {
      en: '⬇️ Download {n} Teams .ics', bn: '⬇️ {n}টি দল .ics ডাউনলোড', hi: '⬇️ {n} टीम .ics डाउनलोड',
      fr: '⬇️ Télécharger {n} équipes .ics', de: '⬇️ {n} Teams .ics laden', es: '⬇️ Descargar {n} equipos .ics',
      pt: '⬇️ Baixar {n} equipes .ics', ar: '⬇️ تنزيل {n} فرق .ics',
    },
    download_1_team: {
      en: '⬇️ Download {team} .ics', bn: '⬇️ {team} .ics ডাউনলোড', hi: '⬇️ {team} .ics डाउनलोड',
      fr: '⬇️ Télécharger {team} .ics', de: '⬇️ {team} .ics laden', es: '⬇️ Descargar {team} .ics',
      pt: '⬇️ Baixar {team} .ics', ar: '⬇️ تنزيل {team} .ics',
    },

    /* Standings */
    standings_title: {
      en: '📊 Group Standings', bn: '📊 গ্রুপ পয়েন্ট তালিকা', hi: '📊 ग्रुप अंक तालिका',
      fr: '📊 Classements des groupes', de: '📊 Gruppenranglisten', es: '📊 Clasificación de grupos',
      pt: '📊 Classificação dos grupos', ar: '📊 ترتيب المجموعات',
    },
    standings_col_p:   { en:'P',  bn:'খেলা', hi:'खेले', fr:'J',  de:'Sp', es:'PJ', pt:'PJ', ar:'ل'  },
    standings_col_w:   { en:'W',  bn:'জয়',   hi:'जीत',  fr:'G',  de:'S',  es:'G',  pt:'V',  ar:'ف'  },
    standings_col_d:   { en:'D',  bn:'ড্র',  hi:'ड्रॉ',  fr:'N',  de:'U',  es:'E',  pt:'E',  ar:'ت'  },
    standings_col_l:   { en:'L',  bn:'হার',  hi:'हार',  fr:'P',  de:'N',  es:'P',  pt:'D',  ar:'خ'  },
    standings_col_gd:  { en:'GD', bn:'গোলপার্থক্য', hi:'गोल अंतर', fr:'DA', de:'TD', es:'DG', pt:'SG', ar:'فارق' },
    standings_col_pts: { en:'Pts', bn:'পয়েন্ট', hi:'अंक', fr:'Pts', de:'Pkt', es:'Pts', pt:'Pts', ar:'نقاط' },

    /* Live */
    live_badge: {
      en: 'LIVE', bn: 'লাইভ', hi: 'लाइव',
      fr: 'EN DIRECT', de: 'LIVE', es: 'EN VIVO',
      pt: 'AO VIVO', ar: 'مباشر',
    },
    live_ht: {
      en: 'HT', bn: 'বিরতি', hi: 'HT',
      fr: 'MT', de: 'HZ', es: 'ET',
      pt: 'INT', ar: 'الاستراحة',
    },
    live_ft: {
      en: 'FT', bn: 'সমাপ্ত', hi: 'FT',
      fr: 'FT', de: 'ET', es: 'FT',
      pt: 'FT', ar: 'انتهت',
    },
    live_pens: {
      en: 'Pens', bn: 'পেনাল্টি', hi: 'पेनल्टी',
      fr: 'Tirs', de: 'Elf.', es: 'Pens',
      pt: 'Pens', ar: 'ركلات',
    },
    live_aet: {
      en: 'AET', bn: 'অতি.সময়', hi: 'AET',
      fr: 'AP', de: 'nV', es: 'AET',
      pt: 'AET', ar: 'بعد الوقت',
    },
  };

  /* ── State ──────────────────────────────────────────────────────────────── */
  let _lang = localStorage.getItem('wc2026_lang') || 'en';

  /* ── Core translate function ──────────────────────────────────────────── */
  function t(key, vars = {}) {
    const entry = STRINGS[key];
    if (!entry) { console.warn(`[i18n] Missing key: ${key}`); return key; }
    const str = entry[_lang] || entry['en'] || key;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }

  /* ── Helpers for arrays ───────────────────────────────────────────────── */
  function days()   { return ['sun','mon','tue','wed','thu','fri','sat'].map(d => t(`day_${d}`)); }
  function months() { return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(m => t(`month_${m}`)); }
  function monthsShort() { return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(m => t(`month_${m}_s`)); }
  function timeSlots() {
    return [
      t('slot_early'), t('slot_morning'), t('slot_afternoon'), t('slot_evening')
    ];
  }

  /* ── Language switch ─────────────────────────────────────────────────── */
  function setLang(id) {
    const lang = LANGUAGES.find(l => l.id === id);
    if (!lang) return;
    _lang = id;
    localStorage.setItem('wc2026_lang', id);

    // Update HTML dir attribute for RTL support
    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', id);

    // Trigger full re-render
    _applyStatic();
    if (typeof App !== 'undefined') App.rerenderAll();
  }

  function getLang()  { return _lang; }
  function getDir()   { return LANGUAGES.find(l => l.id === _lang)?.dir || 'ltr'; }

  /* ── Apply static strings to DOM elements with data-i18n ─────────────── */
  function _applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key  = el.dataset.i18n;
      const attr = el.dataset.i18nAttr; // e.g. "placeholder"
      const val  = t(key);
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
  }

  /* ── Build language switcher UI ──────────────────────────────────────── */
  function buildSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const wrap = document.createElement('div');
    wrap.className = 'lang-switcher';

    LANGUAGES.forEach(lang => {
      const btn = document.createElement('button');
      btn.className   = 'lang-btn' + (lang.id === _lang ? ' active' : '');
      btn.dataset.langId = lang.id;
      btn.title = lang.label;
      btn.innerHTML = `<span class="lang-flag">${lang.flag}</span><span class="lang-name">${lang.nativeLabel}</span>`;
      btn.onclick = () => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setLang(lang.id);
      };
      wrap.appendChild(btn);
    });

    container.appendChild(wrap);
  }

  /* ── Init: apply initial direction + static strings ─────────────────── */
  function init() {
    const lang = LANGUAGES.find(l => l.id === _lang) || LANGUAGES[0];
    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', _lang);
  }

  return { t, days, months, monthsShort, timeSlots, setLang, getLang, getDir, buildSwitcher, init, LANGUAGES };
})();
