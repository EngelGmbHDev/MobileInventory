/**
 * Excel Module - Import/Export using SheetJS
 */

const Excel = {
    /**
     * Import master data from Excel file
     * @param {File} file - Excel file
     * @returns {Object} - { items: [], locations: [] }
     */
    async importMasterData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const result = {
                        items: [],
                        locations: []
                    };
                    
                    // Try to find Items sheet
                    const itemsSheetName = this.findSheet(workbook, ['Items', 'Artikel', 'Articles', 'Sheet1']);
                    if (itemsSheetName) {
                        const itemsSheet = workbook.Sheets[itemsSheetName];
                        const itemsData = XLSX.utils.sheet_to_json(itemsSheet, { header: 1 });
                        result.items = this.parseItems(itemsData);
                    }
                    
                    // Try to find Locations sheet
                    const locationsSheetName = this.findSheet(workbook, ['Locations', 'Lagerplätze', 'Lagerorte', 'Sheet2']);
                    if (locationsSheetName) {
                        const locationsSheet = workbook.Sheets[locationsSheetName];
                        const locationsData = XLSX.utils.sheet_to_json(locationsSheet, { header: 1 });
                        result.locations = this.parseLocations(locationsData);
                    }
                    
                    // If no separate sheets, try to parse single sheet
                    if (result.items.length === 0 && result.locations.length === 0) {
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const allData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        result.items = this.parseItems(allData);
                    }
                    
                    console.log('[Excel] Imported:', result);
                    resolve(result);
                    
                } catch (error) {
                    console.error('[Excel] Import error:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Datei konnte nicht gelesen werden'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    },
    
    /**
     * Find sheet by possible names
     */
    findSheet(workbook, possibleNames) {
        for (const name of possibleNames) {
            if (workbook.SheetNames.includes(name)) {
                return name;
            }
            // Case-insensitive search
            const found = workbook.SheetNames.find(
                s => s.toLowerCase() === name.toLowerCase()
            );
            if (found) return found;
        }
        return null;
    },
    
    /**
     * Parse items data from rows
     */
    parseItems(rows) {
        if (rows.length < 2) return [];
        
        const items = [];
        const headers = rows[0].map(h => String(h).toLowerCase().trim());
        
        // Find column indices
        const codeIdx = this.findColumnIndex(headers, ['code', 'itemcode', 'artikelnummer', 'artikel-nr', 'barcode']);
        const nameIdx = this.findColumnIndex(headers, ['name', 'bezeichnung', 'description', 'artikel']);
        const categoryIdx = this.findColumnIndex(headers, ['category', 'kategorie', 'gruppe', 'group']);
        
        // Default to first columns if not found
        const codeCol = codeIdx !== -1 ? codeIdx : 0;
        const nameCol = nameIdx !== -1 ? nameIdx : 1;
        const catCol = categoryIdx !== -1 ? categoryIdx : 2;
        
        // Parse data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[codeCol]) continue;
            
            items.push({
                code: String(row[codeCol]).trim(),
                name: row[nameCol] ? String(row[nameCol]).trim() : '',
                category: row[catCol] ? String(row[catCol]).trim() : ''
            });
        }
        
        return items;
    },
    
    /**
     * Parse locations data from rows
     */
    parseLocations(rows) {
        if (rows.length < 2) return [];
        
        const locations = [];
        const headers = rows[0].map(h => String(h).toLowerCase().trim());
        
        // Find column indices
        const codeIdx = this.findColumnIndex(headers, ['code', 'locationcode', 'lagerplatz', 'platz', 'bin']);
        const nameIdx = this.findColumnIndex(headers, ['name', 'bezeichnung', 'description']);
        const warehouseIdx = this.findColumnIndex(headers, ['warehouse', 'lager', 'whs']);
        
        // Default to first columns if not found
        const codeCol = codeIdx !== -1 ? codeIdx : 0;
        const nameCol = nameIdx !== -1 ? nameIdx : 1;
        const whsCol = warehouseIdx !== -1 ? warehouseIdx : 2;
        
        // Parse data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[codeCol]) continue;
            
            locations.push({
                code: String(row[codeCol]).trim(),
                name: row[nameCol] ? String(row[nameCol]).trim() : '',
                warehouse: row[whsCol] ? String(row[whsCol]).trim() : ''
            });
        }
        
        return locations;
    },
    
    /**
     * Find column index by possible header names
     */
    findColumnIndex(headers, possibleNames) {
        for (let i = 0; i < headers.length; i++) {
            if (possibleNames.includes(headers[i])) {
                return i;
            }
        }
        return -1;
    },
    
    /**
     * Export scan records to Excel
     * @param {Array} records - Scan records
     * @param {Object} masterData - { items: Map, locations: Map }
     * @returns {Blob} - Excel file blob
     */
    exportRecords(records, masterData = {}) {
        const items = masterData.items || new Map();
        const locations = masterData.locations || new Map();
        
        // Prepare data
        const data = records.map(record => {
            const item = items.get(record.itemCode);
            const location = locations.get(record.locationCode);
            
            return {
                'Zeitstempel': this.formatDate(record.timestamp),
                'Lagerplatz': record.locationCode,
                'Lagerplatz Name': location?.name || '',
                'Artikel': record.itemCode,
                'Artikel Name': item?.name || '',
                'Menge': record.quantity,
                'Artikel gültig': record.isValidItem ? 'Ja' : 'Nein',
                'Lagerplatz gültig': record.isValidLocation ? 'Ja' : 'Nein'
            };
        });
        
        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventur');
        
        // Set column widths
        worksheet['!cols'] = [
            { wch: 20 }, // Zeitstempel
            { wch: 15 }, // Lagerplatz
            { wch: 25 }, // Lagerplatz Name
            { wch: 15 }, // Artikel
            { wch: 30 }, // Artikel Name
            { wch: 10 }, // Menge
            { wch: 12 }, // Artikel gültig
            { wch: 15 }  // Lagerplatz gültig
        ];
        
        // Generate file
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
    },
    
    /**
     * Format date for display
     */
    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    /**
     * Download file
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    /**
     * Generate filename with timestamp
     */
    generateFilename(prefix = 'Inventur') {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 10);
        return `${prefix}_${timestamp}.xlsx`;
    },
    
    /**
     * Create and download template file
     */
    downloadTemplate() {
        // Items sheet data
        const itemsData = [
            ['Code', 'Name', 'Category'],
            ['4006381333931', 'Beispiel Artikel 1', 'Kategorie A'],
            ['4006381333948', 'Beispiel Artikel 2', 'Kategorie B']
        ];
        
        // Locations sheet data
        const locationsData = [
            ['Code', 'Name', 'Warehouse'],
            ['10055-01-01', 'Regal 1, Fach 1', '10055'],
            ['10055-01-02', 'Regal 1, Fach 2', '10055']
        ];
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');
        
        const locationsSheet = XLSX.utils.aoa_to_sheet(locationsData);
        XLSX.utils.book_append_sheet(workbook, locationsSheet, 'Locations');
        
        // Generate and download
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        this.downloadFile(blob, 'Inventur_Vorlage.xlsx');
    }
};

// Export for use
window.Excel = Excel;
