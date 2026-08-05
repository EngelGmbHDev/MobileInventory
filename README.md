# 📦 Mobile Inventur

Progressive Web App für mobile Lagerinventur mit Smartphone-Kamera als Barcode-Scanner.

## Features

- 📷 **Kamera-Scanner** - Barcodes scannen mit der Smartphone-Kamera
- 📁 **Excel-Import** - Stammdaten (Artikel, Lagerplätze) aus Excel laden
- ✅ **Validierung** - Prüfung gescannter Codes gegen Stammdaten
- 📊 **Excel-Export** - Inventurdaten als Excel exportieren
- 📧 **Email-Versand** - Export per Email senden
- 📴 **Offline-Modus** - Funktioniert ohne Internetverbindung
- 📱 **PWA** - Installierbar auf dem Home-Screen

## Schnellstart

### 1. Lokal starten

```bash
# Mit Python
python -m http.server 8080

# Oder mit Node.js
npx serve .
```

Dann `http://localhost:8080` im Browser öffnen.

### 2. Auf Smartphone testen

1. Computer und Smartphone im selben WLAN
2. IP-Adresse des Computers finden (z.B. `192.168.1.100`)
3. Am Smartphone öffnen: `http://192.168.1.100:8080`

> ⚠️ Kamera funktioniert nur über HTTPS oder localhost!

### 3. Online hosten

**GitHub Pages:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USER/REPO.git
git push -u origin main
# In GitHub Settings → Pages → Branch: main
```

**Netlify/Vercel:**
- Repository verbinden
- Automatisches Deployment

## Bedienung

### Stammdaten laden

1. Excel-Datei mit Artikeln und Lagerplätzen erstellen:

**Blatt "Items":**
| Code | Name | Category |
|------|------|----------|
| 4006381333931 | Schrauben M8 | Befestigung |

**Blatt "Locations":**
| Code | Name | Warehouse |
|------|------|-----------|
| 10055-01-01 | Regal 1, Fach 1 | 10055 |

2. In App: "Stammdaten" → Datei hochladen → "Laden"

### Scannen

1. **Lagerplatz scannen** - Wird als aktueller Ort gesetzt
2. **Artikel scannen** - Wird dem Lagerplatz zugeordnet
3. **Menge eingeben** - Mit +/- oder direkt tippen
4. **Speichern** - Grüner Button

### Exportieren

1. "Aufnahmen" Seite öffnen
2. "Excel Export" für Download
3. "Per Email" öffnet Mail-App mit Betreff

## Projektstruktur

```
MobileInventory/
├── index.html          # Haupt-HTML
├── manifest.json       # PWA-Manifest
├── sw.js              # Service Worker (Offline)
├── css/
│   └── styles.css     # Alle Styles
├── js/
│   ├── app.js         # Hauptlogik
│   ├── db.js          # IndexedDB
│   ├── scanner.js     # Kamera-Scanner
│   └── excel.js       # Excel Import/Export
├── icons/             # PWA-Icons
├── CLAUDE.md          # Claude Code Dokumentation
└── README.md          # Diese Datei
```

## Technologie

- **Frontend:** Vanilla JavaScript (ES6+)
- **Storage:** IndexedDB (via Dexie.js)
- **Excel:** SheetJS (xlsx)
- **Scanner:** html5-qrcode
- **PWA:** Service Worker

Keine Build-Tools oder Frameworks erforderlich!

## Browser-Unterstützung

| Browser | Version |
|---------|---------|
| Chrome/Edge | 80+ |
| Safari | 14+ |
| Firefox | 75+ |
| Samsung Internet | 12+ |

## Icons erstellen

Für PWA-Icons die SVG-Dateien in `icons/` zu PNG konvertieren:

```bash
# Mit ImageMagick
convert -background none icons/icon-192.svg -resize 192x192 icons/icon-192.png
convert -background none icons/icon-512.svg -resize 512x512 icons/icon-512.png

# Oder Online-Tool verwenden:
# https://realfavicongenerator.net/
```

## Lizenz

MIT License

## Support

Bei Fragen oder Problemen ein Issue erstellen.
