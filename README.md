# 800m Pacing Calculator

Ein interaktiver, trainingswissenschaftlich fundierter Rechner für optimale 800m-Lauf-Strategien.

## Features

✅ **5 Lauf-Strategien:**
- **Aggressiv** (⚡) – Schneller Start, Laktat-Einbruch
- **Abwartend** (🎯) – Langsamer Start, schneller Finish (Negative Split)
- **Gleichmäßig** (➡️) – Konstante Geschwindigkeit (Baseline)
- **Taktisch** (🎲) – Kicks mit Recoveries
- **Dynamic** (📈) – Stetiger Anstieg zum Finish

✅ **Interaktive Visualisierungen:**
- Split-Tabelle mit Zeit, Tempo, Prozentangaben
- 100m-Split-Balkendiagramm (Farbcodiert: grün=schneller, rot=langsamer)
- Energy-System-Stapeldiagramm (ATP-PC, Glykolyse, Aerob)
- Laktat-Kurve mit LT1/LT2-Schwellen
- 400m-Vergleich (erste vs. zweite Hälfte)

✅ **Alters-Anpassung:**
- 10–18+ Jahre
- Korrekturfaktoren basierend auf anaerober Entwicklung

✅ **Responsive Design:**
- Dark/Light Theme
- Desktop, Tablet, Mobile optimiert
- Token-basierte CSS (Vanilla, keine Frameworks)

## Physiologische Basis

Der 800m ist eine **Mixed-Event**, die drei Energiesysteme nutzt:

1. **ATP-PC-System** (0–10s) – Schnelle Energie, schnell leer
2. **Glykolyse** (10–120s) – Laktat-Produktion, kritisch für 800m
3. **Aerobe Oxidation** (120–320s) – Ausdauer-Baseline

### Alters-Korrekturfaktoren

| Alter | Faktor | Interpretation |
|-------|--------|-----------------|
| 10 J. | 0.80 | -20% anaerobe Kapazität |
| 14 J. | 1.00 | Baseline (optimal entwickelt) |
| 18+ J. | 1.10 | +10% (adult body, experience) |

Jüngere Läufer: reduzierte Strategie-Variation, um Laktat-Übersäuerung zu vermeiden.

## Installation & Start

### Lokal (mit Python):
```bash
cd 800m
python -m http.server 3000
# Dann öffne http://localhost:3000 im Browser
```

### Mit Node.js (http-server):
```bash
npm install -g http-server
cd 800m
http-server -p 3000
```

### Direkt (falls auf Vercel oder GitHub Pages):
Einfach die URL öffnen – keine Build-Tools nötig!

## Tech Stack

- **HTML5** – Semantic markup
- **CSS3** – Design-Tokens, Responsive Grid, Dark/Light Theme
- **Vanilla JavaScript (ES6+)** – Keine Frameworks, keine Dependencies
- **Canvas API** – Datenvisualisierungen

## Berechnung

### Kern-Algorithmus

```javascript
// 1. Basisgeschwindigkeit
velocity = 800m / finishTime

// 2. Alters-Korrekturfaktor
ageFactor = AGE_FACTORS[age]

// 3. Strategie-Split-Faktoren (1-5)
splitFactors = getStrategyFactors(strategy, ageFactor)

// 4. Berechne 100m-Splits
splits = splitFactors.map(f => (100m / velocity) / f)

// 5. Normalisiere auf Zielzeit
splits = splits * (finishTime / sum(splits))
```

### Beispiel: 2:30 Gleichmäßig (14 Jahre)

| Split | Zeit | Kumuliert | Tempo | % |
|-------|------|-----------|-------|---|
| 100m | 18.7s | 18.7s | 2:58 | 100% |
| 200m | 18.7s | 37.4s | 2:58 | 100% |
| 400m | 75.0s | 75.0s | 3:00 | 100% |
| 800m | 150.0s | 150.0s | 3:00 | 100% |

## Interpretationen der Strategien

### Aggressiv (⚡)
- **Tempo-Profil:** [95%, 98%, 95%, 85%, 72%, 68%, 70%, 75%]
- **Was passiert:** Sprint-ähnlicher Start, dann deutlicher Einbruch nach 300m durch Laktat
- **Trainings-Effekt:** Maximales anaerobes Training
- **Für wen:** Sprinter, gute anaerobe Läufer
- **Risiko:** Zu aggressiver Start führt zu Übersäuerung

### Abwartend (🎯) – Negative Split
- **Tempo-Profil:** [82%, 85%, 88%, 92%, 95%, 98%, 96%, 102%]
- **Was passiert:** Kontrollierter Start, dann progressiver Aufbau, schneller Finish
- **Trainings-Effekt:** Intelligente Laktat-Clearing, optimales Finish
- **Für wen:** Langstrecken-Läufer, hohe aerobe Basis
- **Risiko:** Start-Druck, taktisches Mitlaufen

### Gleichmäßig (➡️)
- **Tempo-Profil:** [100%, 100%, 100%, 100%, 100%, 100%, 100%, 100%]
- **Was passiert:** Konstantes Tempo über alle 800m
- **Trainings-Effekt:** VO₂max-Training, maximale Effizienz
- **Für wen:** Anfänger, Technik-Training
- **Risiko:** Wenig taktische Vielfalt

### Taktisch (🎲)
- **Tempo-Profil:** [88%, 100%, 92%, 96%, 98%, 90%, 94%, 105%]
- **Was passiert:** 2 Kicks (200m & 500m) mit Recovery-Phasen
- **Trainings-Effekt:** Hochintensive Tempo-Wechsel, Laktat-Toleranz
- **Für wen:** Erfahrene Läufer, Race-taktisches Training
- **Risiko:** Höchste Laktat-Last

### Dynamic (📈)
- **Tempo-Profil:** [85%, 88%, 90%, 93%, 96%, 99%, 98%, 104%]
- **Was passiert:** Stetiger Aufbau mit progressivem Finish
- **Trainings-Effekt:** VO₂max mit Finish-Spurt
- **Für wen:** Mitteldistanz-Spezialisten
- **Risiko:** Erfordert Trainingserfahrung

## Literaturquellen

- **Gastin, P. B. (2001).** "Energy system interaction and relative contribution during maximal exercise." *Sports Medicine*, 31(10), 725-741.
- **Daniels, J. (2014).** *Daniels' Running Formula* (3rd ed.). Human Kinetics.
- **Spencer, M. R., & Gastin, P. B. (2001).** "Energy system contribution during 200-to 1500-m running in highly trained athletes." *Medicine & Science in Sports & Exercise*, 33(1), 157-162.
- **IAAF (International Association of Athletics Federations).** (2016). Training guidelines für Mitteldistanzen.

## Hinweise

⚠️ **Wichtig:**
- Dieser Rechner berechnet *physiologisch optimale* Pace-Profile basierend auf Energiesystem-Modellen
- **Echte Wettkampf-Performance** hängt ab von:
  - Individuellem Training & Fitness-Level
  - Tagesform & mentaler Bereitschaft
  - Taktischen Entscheidungen im Rennen
  - Konkurrenz & Druck

💡 **Tipp für Trainer:**
- Nutze die Strategien zur **Trainingsplanung**, nicht als feste Race-Taktik
- Längerfristig sollten Läufer **alle 5 Strategien trainieren** für maximale Flexibilität
- Jüngere Läufer: beginne mit Gleichmäßig, steigere zu Abwartend, erst später Aggressiv

## Entwickler

Entwickelt mit trainingswissenschaftlicher Expertise und interaktiver Datenvisualisierung für Sportunterricht & Trainingsplanung.

## Lizenz

Open Source – Frei nutzbar für Schulen, Trainer, Läufer.
