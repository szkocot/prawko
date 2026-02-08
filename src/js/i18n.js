// i18n.js — Internationalization module (Polish / English)

const translations = {
  pl: {
    appName: 'Prawko',
    tagline: 'Wszystkie 3719 oficjalnych pytań egzaminacyjnych',
    featureLearn: 'Tryb nauki',
    featureLearnDesc: 'Ucz się we własnym tempie z natychmiastową informacją zwrotną',
    featureExam: 'Symulacja egzaminu',
    featureExamDesc: 'Realistyczna symulacja z limitem czasu i punktacją',
    featureCategories: '12 kategorii',
    featureCategoriesDesc: 'A, A1, A2, AM, B, B1, C, C1, D, D1, PT, T',
    featureMedia: 'Multimedia',
    featureMediaDesc: 'Zdjęcia i filmy wideo dołączone do pytań',
    featureOffline: 'Tryb offline',
    featureOfflineDesc: 'Działaj bez internetu dzięki technologii PWA',
    examRules: 'Zasady egzaminu',
    examRule1: '32 pytania',
    examRule1Desc: '— 20 z wiedzy podstawowej + 12 specjalistycznych',
    examRule2: '25 minut',
    examRule2Desc: '— łączny czas na rozwiązanie testu',
    examRule3: '68 z 74 pkt',
    examRule3Desc: '— minimum do zdania egzaminu',
    start: 'Rozpocznij',
    dataSource: 'Źródło danych',
    copyright: '© 2025 Prawko',
    attribution: 'Pytania na podstawie oficjalnej bazy',
    ministryName: 'Ministerstwa Infrastruktury',
    back: '← Powrót',
    chooseCategory: 'Wybierz kategorię',
    modeLearn: 'Nauka',
    modeExam: 'Egzamin',
    categoryA: 'Motocykl',
    categoryA1: 'Motocykl 125',
    categoryA2: 'Motocykl 35kW',
    categoryAM: 'Motorower',
    categoryB: 'Samochód osobowy',
    categoryB1: 'Czterokołowiec',
    categoryC: 'Samochód ciężarowy',
    categoryC1: 'Ciężarowy do 7.5t',
    categoryD: 'Autobus',
    categoryD1: 'Autobus do 17 osób',
    categoryPT: 'Tramwaj',
    categoryT: 'Ciągnik rolniczy',
    questionsCount: '{n} pytań',
    endExam: 'Zakończ egzamin',
    prev: 'Poprzednie',
    next: 'Następne',
    examResult: 'Wynik egzaminu',
    part: 'Część',
    scored: 'Uzyskane',
    maximum: 'Maksimum',
    basicQuestions: 'Pytania podstawowe',
    specialistQuestions: 'Pytania specjalistyczne',
    total: 'Razem',
    incorrectAnswers: 'Błędne odpowiedzi',
    noIncorrect: 'Gratulacje! Brak błędnych odpowiedzi.',
    yourAnswer: 'Twoja odpowiedź:',
    correctAnswer: 'Poprawna odpowiedź:',
    noAnswer: 'Brak odpowiedzi',
    retry: 'Spróbuj ponownie',
    backToCategories: 'Powrót do kategorii',
    passed: 'ZDANY',
    failed: 'NIEZDANY',
    yes: 'TAK',
    no: 'NIE',
    confirmExit: 'Czy na pewno chcesz zakończyć?',
    confirmExitDesc: 'Twój postęp nie zostanie zapisany.',
    confirmYes: 'Tak, zakończ',
    confirmNo: 'Nie, kontynuuj',
    dataSourceTitle: 'Źródło danych',
    dataSourceIntro: 'Pytania egzaminacyjne wykorzystane w tej aplikacji pochodzą z oficjalnej bazy danych udostępnionej przez',
    dataSourceMinistry: 'Ministerstwo Infrastruktury',
    dataSourceCountry: 'Rzeczypospolitej Polskiej.',
    licenseQuestions: 'Treść pytań egzaminacyjnych',
    licenseQuestionsDesc: 'Udostępnione na licencji Creative Commons Uznanie autorstwa - Na tych samych warunkach 4.0 Międzynarodowe.',
    licenseMedia: 'Materiały audiowizualne',
    licenseMediaDesc: 'Udostępnione na licencji Creative Commons Uznanie autorstwa - Użycie niekomercyjne - Bez utworów zależnych 4.0 Międzynarodowe.',
    nonCommercial: 'Aplikacja ma charakter niekomercyjny i edukacyjny.',
    imgAlt: 'Ilustracja do pytania',
    questionTimer: 'Pytanie',
    totalTimer: 'Razem',
    saveOffline: 'Pobierz offline',
    savedOffline: 'Dostępne offline',
    examHistory: 'Historia egzaminów',
    noHistory: 'Brak wyników egzaminów. Rozwiąż swój pierwszy egzamin!',
    clearHistory: 'Wyczyść historię',
    offlineNotice: 'Jesteś offline',
    updateAvailable: 'Dostępna aktualizacja',
    tapToRefresh: 'Odśwież',
  },
  en: {
    appName: 'Prawko',
    tagline: 'All 3,719 official driving exam questions',
    featureLearn: 'Learning mode',
    featureLearnDesc: 'Study at your own pace with instant feedback',
    featureExam: 'Exam simulation',
    featureExamDesc: 'Realistic simulation with time limits and scoring',
    featureCategories: '12 categories',
    featureCategoriesDesc: 'A, A1, A2, AM, B, B1, C, C1, D, D1, PT, T',
    featureMedia: 'Multimedia',
    featureMediaDesc: 'Photos and videos attached to questions',
    featureOffline: 'Offline mode',
    featureOfflineDesc: 'Works without internet using PWA technology',
    examRules: 'Exam rules',
    examRule1: '32 questions',
    examRule1Desc: '— 20 basic knowledge + 12 specialist',
    examRule2: '25 minutes',
    examRule2Desc: '— total time to complete the test',
    examRule3: '68 out of 74 pts',
    examRule3Desc: '— minimum to pass the exam',
    start: 'Start',
    dataSource: 'Data Source',
    copyright: '© 2025 Prawko',
    attribution: 'Questions based on the official database of the',
    ministryName: 'Ministry of Infrastructure',
    back: '← Back',
    chooseCategory: 'Choose category',
    modeLearn: 'Learn',
    modeExam: 'Exam',
    categoryA: 'Motorcycle',
    categoryA1: 'Motorcycle 125cc',
    categoryA2: 'Motorcycle 35kW',
    categoryAM: 'Moped',
    categoryB: 'Passenger car',
    categoryB1: 'Quadricycle',
    categoryC: 'Truck',
    categoryC1: 'Truck up to 7.5t',
    categoryD: 'Bus',
    categoryD1: 'Bus up to 17 seats',
    categoryPT: 'Tram',
    categoryT: 'Agricultural tractor',
    questionsCount: '{n} questions',
    endExam: 'End exam',
    prev: 'Previous',
    next: 'Next',
    examResult: 'Exam result',
    part: 'Section',
    scored: 'Scored',
    maximum: 'Maximum',
    basicQuestions: 'Basic questions',
    specialistQuestions: 'Specialist questions',
    total: 'Total',
    incorrectAnswers: 'Incorrect answers',
    noIncorrect: 'Congratulations! No incorrect answers.',
    yourAnswer: 'Your answer:',
    correctAnswer: 'Correct answer:',
    noAnswer: 'No answer',
    retry: 'Try again',
    backToCategories: 'Back to categories',
    passed: 'PASSED',
    failed: 'FAILED',
    yes: 'YES',
    no: 'NO',
    confirmExit: 'Are you sure you want to finish?',
    confirmExitDesc: 'Your progress will not be saved.',
    confirmYes: 'Yes, finish',
    confirmNo: 'No, continue',
    dataSourceTitle: 'Data Source',
    dataSourceIntro: 'The exam questions used in this app come from the official database published by the',
    dataSourceMinistry: 'Ministry of Infrastructure',
    dataSourceCountry: 'of the Republic of Poland.',
    licenseQuestions: 'Exam question text',
    licenseQuestionsDesc: 'Published under the Creative Commons Attribution-ShareAlike 4.0 International license.',
    licenseMedia: 'Audiovisual materials',
    licenseMediaDesc: 'Published under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International license.',
    nonCommercial: 'This app is non-commercial and educational.',
    imgAlt: 'Question illustration',
    questionTimer: 'Question',
    totalTimer: 'Total',
    saveOffline: 'Save offline',
    savedOffline: 'Available offline',
    examHistory: 'Exam history',
    noHistory: 'No exam results yet. Take your first exam!',
    clearHistory: 'Clear history',
    offlineNotice: 'You are offline',
    updateAvailable: 'Update available',
    tapToRefresh: 'Refresh',
  },
};

let currentLang = localStorage.getItem('prawko_lang') || 'pl';
let questionTranslations = null; // Loaded on demand

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang;
  try { localStorage.setItem('prawko_lang', lang); } catch {}
  document.documentElement.lang = lang;
}

export function t(key) {
  return translations[currentLang]?.[key] || translations.pl[key] || key;
}

export async function loadQuestionTranslations() {
  if (questionTranslations) return questionTranslations;
  try {
    const res = await fetch('data/translations_en.json');
    questionTranslations = await res.json();
    return questionTranslations;
  } catch (err) {
    console.warn('Failed to load English translations, falling back to Polish:', err);
    questionTranslations = {};
    window.dispatchEvent(new CustomEvent('translation-load-error', { detail: err }));
    return questionTranslations;
  }
}

export function translateQuestion(question) {
  if (currentLang === 'pl' || !questionTranslations) return question;
  const tr = questionTranslations[String(question.id)];
  if (!tr) return question;
  return {
    ...question,
    q: tr.q || question.q,
    a: tr.a || question.a,
    b: tr.b || question.b,
    c: tr.c || question.c,
  };
}
