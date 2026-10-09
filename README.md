# SpotDrive 🏎️

CarSpotting-App: Autos spotten, sammeln, XP verdienen, leveln und die eigene virtuelle Garage aufbauen.
Version 0.1 – läuft komplett mit lokalen Testdaten (kein Backend nötig).

## Starten

**Schnellster Weg:** `SpotDrive.html` doppelklicken – öffnet die komplette App im Browser (Internet nötig für Fotos, Videos und Kartenkacheln).

**Als Entwickler:**

Voraussetzung: [Node.js](https://nodejs.org) 18 oder neuer.

```bash
npm install
npm run dev
```

Dann im Browser **http://localhost:5173** öffnen. Am besten die Handy-Ansicht der Entwicklertools (F12 → Gerätesymbol) verwenden.
Auf dem Handy im selben WLAN: die im Terminal angezeigte „Network“-Adresse öffnen (GPS funktioniert im Browser nur über `localhost` oder HTTPS).

Produktions-Build: `npm run build` → Ordner `dist/`.

## Tech-Stack

- **React 18 + TypeScript + Vite**
- **React Router** (HashRouter → funktioniert auch als native App)
- **Leaflet** (Karte, CARTO-Dark-Kacheln auf OpenStreetMap-Basis)
- **Capacitor-ready** für Android/iOS (siehe unten)
- Keine UI-Library – eigenes Design-System in `src/styles/global.css`

## Projektstruktur

```
src/
  types/models.ts          Datenmodell (User, Spot, CarModel, Badge, Challenge, Garage …)
  data/                    Testdaten & Registries
    cars.ts                Marken- und Modellkatalog inkl. Seltenheit
    mockData.ts            Testnutzer, Test-Spots, Start-Garage
    badges.ts              Badge-Definitionen (mit Fortschrittsfunktion)
    challenges.ts          Tägliche/wöchentliche Challenges
    garageItems.ts         Böden, Wände, Licht, Hintergründe, Deko (erweiterbar)
    proFeatures.ts         SpotDrive-Pro-Funktionen & Limits
  lib/                     reine Spiel-Logik (ohne UI, gut testbar)
    xp.ts                  XP-Regeln, Level-Kurve, Level-Titel, Garagen-Stufen
    collection.ts          Sammlung (jedes Modell zählt nur einmal)
    badges.ts / challenges.ts
    location.ts            Standort-Privatsphäre (~2 km Raster), Ortsnamen
    rarity.ts
  services/                Schnittstellen nach außen – hier wird später angeschlossen
    repository.ts          Datenzugriff (jetzt localStorage → später Supabase/Firebase)
    carRecognition.ts      KI-Auto-Erkennung (jetzt Demo-Provider)
    device.ts              GPS, Foto verkleinern, Videolänge (später Capacitor-Plugins)
  state/AppStore.tsx       App-State + alle Aktionen (Spot erstellen, Like, XP, Badges …)
  components/              wiederverwendbare Bausteine (SpotCard, CarArt, GarageScene, Karten …)
  screens/                 Home, Karte, Spot erstellen, Garage, Profil, Spot-Detail, Challenges, Pro
```

## Neu in v1.1 – für alle Nutzer (Free & Pro)

- **🛡️ Kennzeichen & Gesichter automatisch verpixeln:** Nach jedem Foto sucht die KI (`detectPrivacyRegions`) nach Kennzeichen und Gesichtern und verpixelt sie (Mosaik, `services/privacyBlur.ts`).
  - Gespeichert wird nur die verpixelte Version; das Original bleibt nur im Arbeitsspeicher.
  - Die Bereiche lassen sich bearbeiten: ziehen bzw. tippen zum Hinzufügen, ✕ zum Entfernen (`PrivacyEditor.tsx`).
  - Reihenfolge der Erkennung: Claude-Vorschau → KI-Server (`POST /api/privacy`) → Browser-Gesichtserkennung → manuell (Hinweis in der App).
  - Absenden wartet, bis die Prüfung fertig ist.
  - TODO(backend): Videos serverseitig verpixeln; vor dem Veröffentlichen zusätzlich auf dem Server prüfen.
- **📤 Car Cards als Story teilen (gratis):** Erzeugt ein Bild im Format 1080×1920 (`services/shareCard.ts`) mit Foto, Seltenheit, Spot-Nummer, Datum, XP, grobem Ort und @Nutzername.
  - Auf dem Handy öffnet sich das Teilen-Menü; am Desktop wird das Bild heruntergeladen.
  - Bei Katalogfotos steht der Wikimedia-Credit im Bild.
  - Der Button ist in Garage, History, Spot-Detail und in der Belohnung „New Car Card“.
- **🎁 Gratis-Daily:** Die erste Daily Challenge des Tages ist für alle – mit Fortschritt, XP und Belohnungs-Animation. Alle weiteren Challenges und die Streak-Boni bleiben Pro.

## Neu in v1.0.1 – ∞ Level ohne Obergrenze

- Es gibt kein Maximal-Level; die Level-Kurve gilt für jedes Level (getestet bis Level 13.000+).
- Ab Master Spotter (Level 75) gibt es alle 25 Level einen Stern: Master Spotter → ★2 (100) → ★3 (125) → … unendlich weiter. Jeder neue Stern löst die Rang-Animation aus.
- Im Profil steht beim Rang „Level 75–∞“ und das nächste Ziel („Noch X Level bis Master Spotter ★N“).

## Neu in v1.0 – 📅 Personal Spotting Calendar (SpotDrive Pro)

- **Bildschirm `/calendar`** (`CalendarScreen.tsx`, Logik in `lib/calendar.ts`). Er ist nur für den Nutzer selbst und zeigt auch private Spots.
- **Monatskalender:**
  - Montag steht zuerst; blättern mit Pfeilen oder durch Wischen.
  - Tage mit Spots zeigen 🚗 und die Anzahl. Die Farbe richtet sich nach dem seltensten Spot des Tages, die Intensität nach der Anzahl.
  - „Heute“ ist markiert.
- **Monatsübersicht:** Spots, neue Modelle, Spotting-Tage, XP, längste Serie, Top-Marke, seltenster Spot und der Vergleich zum Vormonat.
- **Jahresleiste:** Spots pro Monat; ein Tipp springt in den Monat.
- **Tagesdetails:** alle Spots des Tages mit Foto, Uhrzeit, Ort, Seltenheit und XP; ein Tipp öffnet den Spot. Direktlink: `/calendar?d=2026-09-14`.
- **Einstiege:** Profil (Kachel „Kalender“) und Spotting-History („Kalender-Ansicht“). Ohne Pro gibt es eine Vorschau.
- Weitere eigene Test-Spots im September.

## Neu in v0.9 – 🔔 Dream Car Alerts (SpotDrive Pro)

- **Bildschirm `/dream`** (`DreamCarsScreen.tsx`) mit den Tabs Liste, Alerts, Karte und Einstellungen. Im Profil gibt es den Bereich „❤️ Meine Dream Cars“.
- **Wunschliste:**
  - Einträge mit Marke, Modell, Variante, optionalem Foto, Datum und Status.
  - Autos werden über die Modellsuche hinzugefügt; dasselbe Auto kann nicht doppelt auf die Liste.
  - Die Wunschliste gibt es auch ohne Pro. Alerts, Gebiete, Karte und Einstellungen sind Pro.
- **Gebiete:** aktueller Bereich, Stadt (Suche), Region (Liste) oder ein Punkt auf der Karte, jeweils mit Radius von 1 bis 200 km und einer Kartenvorschau.
- **Einstellungen je Dream Car:** Alerts an/aus und das Gebiet (ein bestimmtes Gebiet oder alle).
- **Abgleich** (`lib/dreamAlerts.ts`, reine Funktionen, also direkt als Server-Funktion nutzbar):
  - Nur öffentliche Spots mit sichtbarem Ort zählen; verborgene Orte und private Spots lösen nie einen Alert aus.
  - Geprüft wird mit dem öffentlichen, groben Bereich; der exakte Punkt wird nie übernommen.
  - Jeder Spot wird nur einmal geprüft (`dreamProcessed`).
  - Ähnliche Meldungen (gleiches Auto, ≤ 3 km, ≤ 2 Std.) werden zu einem Alert zusammengefasst.
  - Häufigkeits-Limit: sofort, höchstens 1 pro Stunde oder höchstens 1 pro Tag je Auto.
- **Benachrichtigungen:**
  - In-App-Banner „DREAM CAR SPOTTED!“ und ein Postfach unter „Alerts“.
  - Push im Browser über die Web Notification API (`services/notifications.ts`). TODO: Capacitor Push (FCM/APNs).
- **Dream Car Found:** Spottet man ein Dream Car selbst, gibt es eine eigene Belohnungs-Animation, +500 XP (einmalig) und den Status „Gespottet“ automatisch. Manuell markieren geht auch.
- **Dream-Car-Map:** öffentliche Spots der letzten 7 Tage in den eigenen Gebieten, nur als grober Bereich.
- **Integration:**
  - Alert → Spot ansehen → Speichern oder „📸 Selbst spotten“ (`/create?model=…`) → Sammlung, XP und Challenges.
  - Auf der Karte gibt es den Button ❤️.
- **Testmodus** (Einstellungen): Test-Spot im eigenen Gebiet, doppelte Meldung, verborgener Ort. Die Testdaten enthalten Spots in Zürich und München.
- TODO(backend): Tabellen `dream_cars`, `alert_areas`, `dream_alerts`, `push_tokens`; ein Trigger nach jedem Spot-Insert mit PostGIS `ST_DWithin`.

## Neu in v0.8 – 🎨 Custom Spot Cards (SpotDrive Pro)

- **Card Editor** (`/cards/editor`, Screen `CardEditorScreen.tsx`): Live-Vorschau oben, darunter Vorlagen, Design, Hintergrund, Rahmen, Effekt und Text-Stil. Button „Als Standard speichern“.
- **12 Pro-Designs:** Dark, Carbon, Racing, Luxury, Neon, Gold, Electric, Motorsport, Diamond, Legendary, Master Card, Holo. Dazu der kostenlose Standard.
- **Freischaltungen:** Racing ab Level 10, Diamond mit 10 legendären Spots, Legendary mit 3 legendären Spots, Master Card ab Level 50, Holo über legendäre Challenges.
- **Hintergründe:** 20 Stück in den Kategorien Vorlagen, Verläufe, Muster, Automotive, Carbon und Metall. Die Farbe ist nur aus der Palette des jeweiligen Designs wählbar.
- **Rahmen:** 7 Stück. „Seltenheit“ ist der Standard und gilt auch für Free-Nutzer:
  - Common: normal;
  - Rare: Doppelrahmen;
  - Epic: animierter Rahmen;
  - Exotic: animierter Rahmen mit Glow;
  - Legendary: Goldrahmen mit Ecken und Glow;
  - Impossible: Regenbogen mit Glow.
- **Effekte:** Glow, Animation, Partikel, Lichtreflexion, Carbon und Metallic, höchstens 3 gleichzeitig.
  - Sie liegen hinter der halbtransparenten Info-Fläche, damit alles lesbar bleibt.
  - Bei „Bewegung reduzieren“ laufen keine Animationen.
- **Speichern:**
  - Standard je Seltenheit, für alle Cards oder für eine einzelne Card.
  - Auflösung: Card → Seltenheit → Alle → Standard (`lib/cardStyle.ts`).
  - Neue Cards bekommen automatisch das Design ihrer Seltenheit.
- **Integration:** Die Cards erscheinen überall: in der Reward-Animation nach dem Spot, im Garage-Album (Button „🎨 Design“) und in der Spotting-History (neue Ansicht „🃏 Spot Cards“).
  - Card-Infos: Foto, Marke, Modell, Variante, Seltenheit, Spot-Nr., Datum, ungefährer Ort, XP und Collector-Status.
- Registry: `src/data/cardDesigns.ts`. Die Beispiel-Standards sind Common → Dark, Rare → Carbon, Epic → Neon und Legendary → Diamond.
- TODO(backend): Tabelle `card_styles` anlegen; die Freischaltungen serverseitig prüfen.

## Neu in v0.7.1 – 🤖 Seltenheit bestimmt nur die KI

- Nutzer können die Seltenheit **nie** selbst wählen. Sie kommt aus geprüften Katalogdaten (`rarityBy: 'curated'`) oder von der KI (`'ai'`).
- Foto-Erkennung: Die KI-Seltenheit wird auch für bereits vorhandene (nicht geprüfte) Katalogmodelle übernommen.
- Manuell gewählte / eingegebene Autos: `classifyRarity()` fragt die KI per Text (Claude-Vorschau oder `POST /api/rarity` im KI-Server). Bis das Ergebnis da ist, zeigt die App „🤖 KI bestimmt Seltenheit…“ und das Absenden wartet.
- Ohne erreichbare KI bleibt eine vorläufige Schätzung (`'estimate'`), die beim nächsten Mal von der KI ersetzt wird.
- KI-Ergebnisse werden in `aiRarity` gespeichert. TODO(backend): serverseitig speichern, damit sie für alle gelten.
- Bugatti Chiron Super Sport ist jetzt 🌴 **Exotisch**.

## Neu in v0.7 – 🏁 Spotting Challenges (SpotDrive Pro)

Eigener Tab „Challenges“ in der Hauptnavigation. Ohne Pro: Vorschau + Paywall. Mit Pro:
- **🔥 Heute**: 3 Daily Challenges pro Tag (für alle Nutzer gleich, deterministisch rotiert), z. B. „Finde 3 verschiedene Porsche“, „Finde 2 BMW M-Modelle“, „Finde ein italienisches Supercar“, „Finde ein Auto mit mehr als 500 PS“ (PS-Werte für alle kuratierten Modelle hinterlegt).
- **📅 Diese Woche**: 3 Weekly + 1 Legendary Challenge pro Woche (z. B. „Finde einen Koenigsegg“ → +2.000 XP + 👑 Legendary Hunter Badge).
- **👤 Meine**: eigene Ziele (Name, Ziel, Anzahl, Zeitraum, Beschreibung) – 25–250 XP, damit Mini-Ziele nicht zum XP-Farmen taugen.
- **🌍 Community**: gemeinsamer Fortschritt (Testwerte + eigene Spots), teilnehmen, Belohnung für alle Teilnehmer.
- **✅ Abgeschlossen**: Verlauf + Trophäen.
- Challenge-Seltenheit Gewöhnlich/Ungewöhnlich/Selten/Episch/Legendär = +100/+250/+500/+1.000/+2.000 XP; Extras: Badges, Garage-Deko (nur per Challenge), Car-Card-Designs (Carbon, Gold, Neon, Holo), Titel fürs Profil.
- **Automatisch**: Nach jedem Spot wird der Fortschritt aus den Spots im Zeitfenster berechnet („verschiedene Modelle“ zählt jedes Modell nur einmal). Belohnung genau einmal pro Challenge und Zeitfenster → „🎉 CHALLENGE COMPLETED!“.
- **Streak**: Tage in Folge mit mindestens einer geschafften Challenge – Boni bei 3/7/14/30 Tagen.
- Logik: `src/lib/challenges.ts`, Pool & Belohnungen: `src/data/challenges.ts`.

## Neu in v0.6 – Car Cards, Spotting-History, Smart Search

- **🃏 Digital Car Cards** (Garage → „Car Cards“): automatisch eine Sammelkarte pro Modell – großes Foto, Marke, Modell, Variante, Seltenheit, erster Spot, Ort, Spot-Nr., Anzahl Spots und Karten-Stufe (Bronze 1× · Silber 3× · Gold 5× · Platin 10×). Holo-Effekt ab Episch, 3D-Neigung in der Detailansicht. Sortieren (neueste, älteste, Seltenheit, Marke, meist gespottet) und filtern (Marke, Modell, Seltenheit, Datum, gesammelt / noch nicht gesammelt). Neues Modell → „NEW CAR CARD UNLOCKED!“ mit Karten-Flip. Logik: `src/lib/cards.ts`.
- **📅 Spotting-History** (Profil → „Spotting-History“, Route `#/history`): Timeline nach Tagen mit Uhrzeit, Foto/Video, Auto, Ort, XP und Seltenheit. Filter: heute, diese Woche, dieser Monat, dieses Jahr, Marke, Seltenheit. Statistiken: Spots, Modelle, längste & aktuelle Serie, XP, meistgespottete Marke, seltenste Spots. Nur für den Nutzer selbst sichtbar. Logik: `src/lib/history.ts`.
- **🔎 Smart Search** (Lupe auf der Startseite, Route `#/search`): versteht normale Sätze auf Deutsch & Englisch, z. B. „Welche Lamborghini habe ich noch nicht gesammelt?“, „Wie viele Ferrari habe ich?“, „Zeige mir meine legendären Spots“, „Meine längste Serie“, „@lena“. Läuft komplett lokal ohne KI. Logik: `src/lib/smartSearch.ts`.

## Neu in v0.5 – Seltenheiten wie im Sammelspiel

| Stufe | Beispiele | Bonus beim Erstfund |
|---|---|---|
| ⚪ Gewöhnlich | Alltagsautos | – |
| 🔷 Selten | 911 Carrera, Ferrari Roma, Rolls-Royce Ghost | +250 XP |
| 💜 Episch | 911 GT3 RS, SF90, 765LT, Revuelto | +500 XP |
| 🌴 Exotisch | Bugatti Chiron, McLaren Senna, Porsche 918, Ferrari F80 | +750 XP |
| 👑 Legendär | Ferrari F40, LaFerrari, Koenigsegg Jesko, Miura | +1.000 XP |
| 🌌 Unmöglich | Bugatti Divo, Lamborghini Sián, Koenigsegg CC850, Bentley Batur | +2.500 XP |

Ab Episch gibt es ein eigenes Banner („LEGENDÄRER FUND!“), leuchtende Feed-Karten und bei Unmöglich einen Regenbogen-Rahmen. Neue Badges: „Exoten-Jäger“ und „Das Unmögliche“. Die KI schätzt die Stufe auch für Autos, die nicht im Katalog stehen. Definition: `src/lib/rarity.ts`.

## Neu in v0.4 – jedes Auto zählt

- **Alle Autos der Welt**: Offener Katalog mit 360 Marken und ~2.000 Modellen (npm-Paket `car-brands-models`, MIT) plus kuratierte Supercars mit Fotos. Fehlt ein Auto, kann man es selbst eintragen („Auto nicht dabei?“) – oder die KI legt es automatisch an.
- **Keine Obergrenzen mehr**: Sammlung und Garage zeigen keine „x von y“-Zahlen mehr. Die Garage hat unbegrenzt Platz; jedes Modell steht genau einmal darin, egal wie oft man es spottet.
- **KI-Erkennung für jedes Auto** (startet automatisch nach dem Foto):
  1. In der claude.ai-Vorschau erkennt Claude das Auto direkt (fragt beim ersten Mal um Erlaubnis).
  2. Lokal mit eigenem KI-Server:
     ```bash
     # Terminal 1 (API-Key von console.anthropic.com)
     ANTHROPIC_API_KEY=sk-ant-... npm run server
     # Windows PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..."; npm run server
     # Terminal 2
     npm run dev
     ```
  3. Ohne KI (z. B. SpotDrive.html per Doppelklick) läuft ein Demo-Modus, der nur rät – dort Auto manuell wählen.

## Neu in v0.2

- **Echte Fotos überall**: Feed, Spot-Detail, Garage, Sammlung, Favoriten, seltenstes Auto, Modellauswahl und „NEUER SPOT!“-Animation zeigen echte Bilder. Reihenfolge: eigenes Foto des Nutzers → Katalogfoto (Wikimedia Commons, freie Lizenz, Urheber wird angezeigt) → Illustration nur als Offline-Fallback.
- **Videos = Pro**: Video-Spots erstellen (aufnehmen/hochladen, bis 60 s) und Videos im Feed abspielen nur mit SpotDrive Pro. Free-Nutzer sehen das Standbild mit „Video ansehen mit PRO“.
- **Echte Weltkarte**: Straßenkarte, dunkle Karte oder Satellit (umschaltbar). Darunter liegt eine eingebaute Vektor-Weltkarte (Natural Earth: Länder, Küsten, Seen, Flüsse, Autobahnen, Städte), die auch offline funktioniert.
- Bildnachweise: Profil → ⚙️ → „Bildnachweise“.

## Was funktioniert (v0.1)

- **Feed** mit Likes (auch Doppeltipp), Kommentaren, Speichern, Profilen anderer Nutzer, Tabs „Entdecken / Folge ich / Videos (Pro)“
- **Spot erstellen**: Foto aufnehmen/aus Galerie, Video wählen (Free 15 s, Pro 60 s), Video aufnehmen (Pro), Marke/Modell wählen oder Demo-KI-Erkennung, Baujahr/Variante, Beschreibung, GPS oder Pin auf der Karte, öffentlich/privat
- **Standort-Privatsphäre**: Standard = nur ~2 km Bereich öffentlich; optional „genau“ oder „verbergen“
- **XP & Level**: +50 Auto, +100 neues Modell, +250/+500/+1000 Seltenheitsbonus, +25 Video, +50 neue Marke, Challenge- und Badge-XP. Level-Titel Beginner → Master Spotter. Animationen für „NEUER SPOT!“, Level-Up, Badges
- **Sammlung** pro Marke (z. B. Porsche 3/15). Dasselbe Modell zählt nur einmal; Seltenheitsbonus gibt es nur beim Erstfund (Anti-Farming)
- **Virtuelle Garage**: Showroom mit Drehbühne, Plätze je Garage-Stufe (4/8/12/20), Autos umparken, Favoriten, seltenstes Auto, Gestalten (Boden, Wände, Licht, Hintergrund, Deko – mit Level-/Pro-Sperren)
- **Badges**, **Challenges** (täglich/wöchentlich, XP einlösen)
- **Karte** mit Marker-Filtern (Lamborghini, Ferrari, Porsche, McLaren, Bugatti, Koenigsegg, andere, selten)
- **SpotDrive Pro**: Paywall-UI, Pro-Symbole, Demo-Schalter im Profil (⚙️) – keine echte Zahlung
- Alle Daten werden lokal im Browser gespeichert. Zurücksetzen: Profil → ⚙️ → „Demo-Daten zurücksetzen“

## Nächste Schritte (im Code mit `TODO(...)` markiert)

| Bereich | Wo | Empfehlung |
|---|---|---|
| Backend & Datenbank | `services/repository.ts`, `state/AppStore.tsx` | Supabase (Postgres + Auth + Storage) |
| XP serverseitig | `lib/xp.ts` | Edge Function beim Spot-Insert – sonst manipulierbar |
| Standort-Schutz | `lib/location.ts` | exakte Koordinaten nie an andere Clients senden (DB-View) |
| Login | `ProfileScreen.tsx` | Apple / Google / E-Mail-Link |
| Medien-Upload | `CreateScreen.tsx`, `device.ts` | Supabase Storage / S3, Thumbnails serverseitig |
| KI-Erkennung | `services/carRecognition.ts` | eigenes Backend-Endpoint + Vision-Modell |
| Bezahlung | `ProScreen.tsx`, `proFeatures.ts` | RevenueCat (In-App-Käufe iOS/Android) |
| Reverse Geocoding | `lib/location.ts` | Nominatim / Mapbox – nur Stadtteil speichern |

## Als Android-/iOS-App veröffentlichen (Capacitor)

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm i @capacitor/camera @capacitor/geolocation
npm run build
npx cap add android      # benötigt Android Studio
npx cap add ios          # benötigt Mac + Xcode
npx cap sync
npx cap open android     # bzw. ios
```

Die Konfiguration liegt in `capacitor.config.ts`. Für den Store werden noch App-Icons, Splash-Screen,
Datenschutzerklärung und die Berechtigungstexte für Kamera/Standort benötigt.

## v1.2 – Google Maps + echte Pro-Bezahlung (Web & App)

**Google-Karte (für alle Nutzer).** Mit `VITE_GOOGLE_MAPS_KEY` in `.env` nutzen alle Karten (Spot-Karte, Standort wählen,
Dream-Gebiete) Google Maps (`src/components/GoogleMapView.tsx`, Lader `src/services/googleMaps.ts`). Ohne Schlüssel – oder wenn
Google den Schlüssel ablehnt – fällt SpotDrive automatisch auf die kostenlose Leaflet-Karte zurück.
Schlüssel in der Cloud Console beschränken: HTTP-Referrer (+ Android/iOS-App-ID), nur *Maps JavaScript API*, Budget-Warnung.
Die einzelne `SpotDrive.html` hat keine feste Domain → dort greift die Referrer-Beschränkung nicht; Google Maps nur in der gehosteten Version nutzen.

**Pro bezahlen: 4,99 €/Monat · 39,99 €/Jahr · 7 Tage gratis.** Ein Pro-Status für Web und App, Quelle der Wahrheit ist der Server (`server/billing.mjs`):

| Plattform | Bezahlung | Verwalten |
|---|---|---|
| Web | Stripe Checkout | Stripe-Kundenportal (Button „Abo verwalten / kündigen") |
| iOS / Android | In-App-Abo über RevenueCat (Apple/Google schreiben das für digitale Abos vor, Gebühr 15–30 %) | App Store / Google Play |
| Nichts eingerichtet | Demo-Freischaltung (gekennzeichnet) – im Release mit `VITE_DISABLE_DEMO_PRO=1` abschalten | – |

Einrichtung Web: In Stripe zwei wiederkehrende Preise anlegen, Webhook auf `POST /api/billing/webhook/stripe` (Events:
`checkout.session.completed`, `customer.subscription.*`), Kundenportal aktivieren. Server starten mit
`STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, STRIPE_WEBHOOK_SECRET, APP_URL` (siehe `.env.example`).
Einrichtung App: `src/services/purchases.native.example.ts.txt` (RevenueCat-Plugin) + Webhook auf `/api/billing/webhook/revenuecat`.

Offene Punkte (vor dem echten Start): Nutzerkonten/Login (heute identifiziert eine anonyme Installations-ID den Nutzer, Käufe
folgen ihm nicht auf ein anderes Gerät), Datenbank statt `server/data/entitlements.json`, Pro-Prüfung auch serverseitig bei
KI-Erkennung, Impressum/AGB/Widerrufsbelehrung (Abo!), Umsatzsteuer/Stripe Tax klären.

