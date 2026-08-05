# MobileInventory - PWA Warehouse Scanner

## Project Overview

Lightweight Progressive Web App for warehouse inventory on smartphones. No server required - runs entirely in browser with offline support.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: IndexedDB (via Dexie.js)
- **Excel**: SheetJS (xlsx)
- **Scanner**: html5-qrcode (camera-based barcode scanning)
- **PWA**: Service Worker for offline functionality

## Project Structure

```
MobileInventory/
├── index.html          # Main HTML (single page)
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
├── css/
│   └── styles.css     # All styles
├── js/
│   ├── app.js         # Main application logic
│   ├── db.js          # IndexedDB operations
│   ├── scanner.js     # Camera scanner
│   ├── excel.js       # Excel import/export
│   └── email.js       # Email functionality
├── data/
│   └── stammdaten.xlsx # Optional shared master data file (see below)
├── icons/             # PWA icons (192x192, 512x512)
└── CLAUDE.md          # This file
```

## Key Features

1. **Excel Import**: Load master data (ItemCodes, Locations)
2. **Camera Scanner**: Scan barcodes using smartphone camera
3. **Validation**: Check scanned codes against master data
4. **Data Entry**: Location → Item → Quantity workflow
5. **Local Storage**: All data in IndexedDB
6. **Excel Export**: Generate results spreadsheet
7. **Email**: Send results via mailto: or API
8. **Offline**: Works without internet after first load

## Data Flow

```
Excel Upload → IndexedDB (master data)
                    ↓
Camera Scan → Validate → IndexedDB (scan records)
                    ↓
Export → Excel File → Email
```

## Database Schema (IndexedDB)

### masterItems
- `code` (primary key): Item barcode/code

### masterLocations
- `code` (primary key): Location barcode
- `warehouse`: Warehouse code

### scanRecords
- `id` (auto): Record ID
- `timestamp`: Scan time
- `locationCode`: Scanned location
- `itemCode`: Scanned item
- `quantity`: Entered quantity
- `isValidItem`: Was item in master data?
- `isValidLocation`: Was location in master data?

### appSettings
- `key` (primary key): Setting name
- `value`: Setting value

## UI Language

- **Interface**: German (Deutsch)
- **Code/Comments**: English

## Coding Guidelines

1. **No frameworks** - vanilla JS only
2. **ES6+ features** - async/await, modules, arrow functions
3. **Mobile-first** - touch-optimized, large buttons
4. **Offline-first** - cache everything, sync later
5. **Error handling** - user-friendly German messages

## Scanner Configuration

```javascript
// html5-qrcode config
{
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.QR_CODE
    ]
}
```

## Excel Format (Import)

Expected columns in uploaded Excel. Kept intentionally minimal (no Name/Category)
so master data files stay cheap to produce and fast to import at scale
(tens of thousands of rows) — the app always displays/exports by code.

**Sheet 1: Items**
| Column A |
|----------|
| Code     |

**Sheet 2: Locations**
| Column A | Column B  |
|----------|-----------|
| Code     | Warehouse |

## Shared Master Data File (Server-Hosted)

For teams that use one common master data file instead of everyone
uploading their own, an Excel file can be placed as a static asset in the
project folder (default: `data/stammdaten.xlsx`) and loaded via `fetch()`
from the "Stammdaten" page ("🌐 Aus Projektordner laden" button). This
still requires no backend — the file is just served statically alongside
`index.html` by whatever static host is already serving the app.

- Same format/column rules as manual import (see above)
- Path is configurable per-device via the text field next to the button
  (persisted in `appSettings` under key `masterDataUrl`, default
  `data/stammdaten.xlsx`)
- Implemented in `Excel.importMasterDataFromUrl()` (`js/excel.js`) and
  `App.loadMasterDataFromServer()` (`js/app.js`)
- Loading replaces existing master data the same way manual upload does
  (`masterItems`/`masterLocations` tables are cleared and repopulated)

## Excel Format (Export)

Generated Excel contains:

| Zeitstempel | Lagerplatz | Artikel | Menge | Artikel gültig | Lagerplatz gültig |
|-------------|------------|---------|-------|-----------------|--------------------|

## Deployment

1. **GitHub Pages**: Push to `gh-pages` branch
2. **Netlify**: Connect repo, auto-deploy
3. **Vercel**: Connect repo, auto-deploy
4. **Any static host**: Upload all files

## Local Development

```bash
# Simple HTTP server
python -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080` on phone (same WiFi network)

## Browser Support

- Chrome/Edge 80+
- Safari 14+
- Firefox 75+
- Samsung Internet 12+

## PWA Installation

1. Open app in browser
2. Tap "Add to Home Screen" (or browser menu)
3. App icon appears on home screen
4. Works offline after first load

## Common Tasks

### Add new barcode format
Edit `js/scanner.js`, add to `formatsToSupport` array

### Change validation rules
Edit `js/app.js`, `validateScan()` function

### Modify Excel export format
Edit `js/excel.js`, `exportToExcel()` function

### Add new language
Create translation object in `js/app.js`

## External Libraries (CDN)

```html
<!-- SheetJS for Excel -->
<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>

<!-- html5-qrcode for camera scanner -->
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>

<!-- Dexie.js for IndexedDB -->
<script src="https://unpkg.com/dexie@3.2.4/dist/dexie.min.js"></script>
```

## Security Notes

- No sensitive data stored
- No authentication required
- All data stays on device
- HTTPS required for camera access
