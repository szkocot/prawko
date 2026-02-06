# 🚗 Prawko — Egzamin na prawo jazdy

**https://szkocot.github.io/prawko/**

Aplikacja webowa (PWA) do nauki i symulacji egzaminu na prawo jazdy w Polsce. Zawiera wszystkie 3719 oficjalnych pytań egzaminacyjnych z bazy Ministerstwa Infrastruktury.

## Funkcje

- **Tryb nauki** — przeglądanie pytań po kategoriach, bez limitu czasu, z zapamiętywaniem postępu
- **Symulacja egzaminu** — 32 pytania, 25 minut, punktacja jak na prawdziwym egzaminie
- **12 kategorii** — A, A1, A2, AM, B, B1, C, C1, D, D1, PT, T
- **Multimedia** — zdjęcia i filmy z oficjalnej bazy
- **Polski i angielski** — przełączanie języka interfejsu i pytań
- **Tryb ciemny / jasny** — przełączanie motywu kolorystycznego
- **Tryb offline** — działa bez internetu dzięki Service Worker
- **Mobilna** — w pełni responsywna

## Zasady egzaminu

- 20 pytań podstawowych (TAK/NIE, 20 sekund) + 12 specjalistycznych (A/B/C, 50 sekund)
- Maksymalnie **74 punkty**, próg zaliczenia **68 punktów** (92%)
- Łączny czas: **25 minut**

## Generowanie danych

Wymagania: Python 3 z `openpyxl`, `ffmpeg`, `cwebp`

```bash
# Parsowanie Excela → JSON
python3 scripts/parse-excel.py

# Konwersja wideo WMV → MP4 (GPU: h264_videotoolbox na macOS)
bash scripts/convert-videos.sh

# Optymalizacja obrazów JPG → WebP
bash scripts/optimize-images.sh

# Filtrowanie pytań bez wymaganych multimediów
python3 scripts/filter-no-media.py

# Upload multimediów na Backblaze B2
bash scripts/upload-media.sh
```

## TODO

- [ ] Odzyskać 8 brakujących plików multimedialnych (31 pytań wykluczonych):
  - `!RS_Parking zastrzeżony.webp`
  - `313D12_a_org_światło.webp`
  - `policjant_przód_02.webp`, `policjant_przód_03.webp`, `policjant_przód_ręka_w_górze.webp`
  - `zagłówekorg.webp`
  - `JAZDA NOCĄorg.mp4`, `pięć5.mp4`

## Źródło danych

Pytania egzaminacyjne pochodzą z oficjalnej bazy Ministerstwa Infrastruktury:
https://www.gov.pl/web/infrastruktura/prawo-jazdy

- **Treść pytań**: licencja CC BY-SA 4.0
- **Materiały audiowizualne**: licencja CC BY-NC-ND 4.0

---

# 🚗 Prawko — Polish Driving License Exam

**https://szkocot.github.io/prawko/**

A PWA web app for Polish driving license exam preparation. Contains all 3,719 official exam questions from the Ministry of Infrastructure database.

## Features

- **Learning mode** — browse questions by category, no time limit, progress tracking
- **Exam simulation** — 32 questions, 25 minutes, real scoring
- **12 categories** — A, A1, A2, AM, B, B1, C, C1, D, D1, PT, T
- **Media** — images and videos from the official database
- **Polish & English** — switchable UI and question language
- **Dark / light theme** — toggle color scheme
- **Offline mode** — works without internet via Service Worker
- **Mobile-friendly** — fully responsive

## Data Source

Questions from the official Ministry of Infrastructure database:
https://www.gov.pl/web/infrastruktura/prawo-jazdy

- **Question text**: CC BY-SA 4.0
- **Audiovisual materials**: CC BY-NC-ND 4.0

## TODO

- [ ] Recover 8 missing media files (31 questions excluded):
  - `!RS_Parking zastrzeżony.webp`, `313D12_a_org_światło.webp`
  - `policjant_przód_02.webp`, `policjant_przód_03.webp`, `policjant_przód_ręka_w_górze.webp`
  - `zagłówekorg.webp`
  - `JAZDA NOCĄorg.mp4`, `pięć5.mp4`

## License

This app is non-commercial. See the "Źródło danych" section in the app for full attribution.
