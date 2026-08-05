# Gemeinsame Stammdaten-Datei

Lege hier eine Excel-Datei namens `stammdaten.xlsx` ab, wenn alle Nutzer
dieselben Stammdaten (Artikel, Lagerplätze) verwenden sollen, statt sie
manuell hochzuladen.

Die App liest sie in der Stammdaten-Seite über "🌐 Aus Projektordner laden"
per `fetch()` — sie muss dafür über denselben Webserver ausgeliefert werden
wie `index.html` (Pfad ist relativ, Standard: `data/stammdaten.xlsx`).

Format wie beim manuellen Upload (siehe `CLAUDE.md` → "Excel Format
(Import)"), am einfachsten über den Button "📄 Vorlage herunterladen" auf
der Stammdaten-Seite erzeugen und hier ablegen.

## Quelle der Daten (SAP Business One)

`StammdatenExport.sql` enthält die Queries, mit denen sich die Daten aus
SAP Business One ziehen lassen (Tabellen `OITM` für Artikel, `OBIN` für
Lagerplätze) — Spalten passen direkt zum erwarteten Excel-Format
(`Code`/`Barcode` bzw. `Code`/`Warehouse`).
