/**
 * Scanner Module - Camera-based barcode scanning using html5-qrcode
 */

const Scanner = {
    html5QrCode: null,
    isScanning: false,
    onScanCallback: null,
    lastScanTime: 0,
    scanCooldown: 1000, // Prevent duplicate scans within 1 second
    
    // Supported barcode formats
    formats: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX
    ],
    
    /**
     * Initialize scanner
     * @param {string} elementId - ID of the container element
     * @param {function} onScan - Callback when code is scanned
     */
    async init(elementId, onScan) {
        this.onScanCallback = onScan;
        
        try {
            this.html5QrCode = new Html5Qrcode(elementId, {
                formatsToSupport: this.formats,
                verbose: false
            });
            console.log('[Scanner] Initialized');
            return true;
        } catch (error) {
            console.error('[Scanner] Init error:', error);
            return false;
        }
    },
    
    /**
     * Start scanning
     * @param {string} facingMode - 'environment' (back) or 'user' (front)
     */
    async start(facingMode = 'environment') {
        if (this.isScanning) {
            console.log('[Scanner] Already scanning');
            return;
        }
        
        if (!this.html5QrCode) {
            console.error('[Scanner] Not initialized');
            return;
        }
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.5,
            disableFlip: false
        };
        
        try {
            await this.html5QrCode.start(
                { facingMode },
                config,
                (decodedText, decodedResult) => this.handleScan(decodedText, decodedResult),
                (errorMessage) => {
                    // Ignore scan errors (no barcode found)
                }
            );
            this.isScanning = true;
            console.log('[Scanner] Started');
        } catch (error) {
            console.error('[Scanner] Start error:', error);
            throw error;
        }
    },
    
    /**
     * Stop scanning
     */
    async stop() {
        if (!this.isScanning || !this.html5QrCode) {
            return;
        }
        
        try {
            await this.html5QrCode.stop();
            this.isScanning = false;
            console.log('[Scanner] Stopped');
        } catch (error) {
            console.error('[Scanner] Stop error:', error);
        }
    },
    
    /**
     * Handle successful scan
     */
    handleScan(decodedText, decodedResult) {
        const now = Date.now();
        
        // Prevent duplicate scans
        if (now - this.lastScanTime < this.scanCooldown) {
            return;
        }
        this.lastScanTime = now;
        
        console.log('[Scanner] Scanned:', decodedText);
        
        // Clean the code
        const cleanCode = this.cleanCode(decodedText);
        
        // Feedback
        this.playFeedback();
        
        // Callback
        if (this.onScanCallback) {
            this.onScanCallback(cleanCode, decodedResult);
        }
    },
    
    /**
     * Clean scanned code (remove control characters)
     */
    cleanCode(code) {
        if (!code) return '';
        
        // Remove control characters (0x00-0x1F and 0x7F)
        return code
            .split('')
            .filter(c => {
                const charCode = c.charCodeAt(0);
                return charCode >= 0x20 && charCode !== 0x7F;
            })
            .join('')
            .trim();
    },
    
    /**
     * Play scan feedback (beep and vibration)
     */
    async playFeedback() {
        // Vibration
        const vibrateEnabled = await Database.getSetting('vibrateOnScan', true);
        if (vibrateEnabled && navigator.vibrate) {
            navigator.vibrate(100);
        }
        
        // Beep
        const beepEnabled = await Database.getSetting('beepOnScan', true);
        if (beepEnabled) {
            this.playBeep();
        }
    },
    
    /**
     * Play beep sound
     */
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 1800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('[Scanner] Beep error:', error);
        }
    },
    
    /**
     * Get available cameras
     */
    async getCameras() {
        try {
            const devices = await Html5Qrcode.getCameras();
            return devices;
        } catch (error) {
            console.error('[Scanner] Get cameras error:', error);
            return [];
        }
    },
    
    /**
     * Check if camera is available
     */
    async hasCamera() {
        const cameras = await this.getCameras();
        return cameras.length > 0;
    }
};

// Export for use
window.Scanner = Scanner;
