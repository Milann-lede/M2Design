/**
 * ModernWeb - GDPR Cookie Consent logic
 */

class CookieConsent {
    constructor() {
        this.cookieName = 'modernweb_consent';
        this.consent = this.getConsent();
        this.modal = null;
        this.init();
    }

    getConsent() {
        const stored = localStorage.getItem(this.cookieName);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    saveConsent(settings) {
        const consentData = {
            timestamp: new Date().toISOString(),
            necessary: true,
            analytics: settings.analytics || false,
            marketing: settings.marketing || false
        };
        localStorage.setItem(this.cookieName, JSON.stringify(consentData));
        this.consent = consentData;

        // Dispatch event for other scripts to listen
        window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: consentData }));
    }

    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.render());
        } else {
            this.render();
        }

        // Listen for open requests (e.g. from footer)
        document.addEventListener('click', (e) => {
            if (e.target.matches('.js-open-cookies')) {
                e.preventDefault();
                this.showManager();
            }
        });
    }

    render() {
        if (document.getElementById('cookie-consent-modal')) return;

        const html = `
            <div id="cookie-consent-modal" class="cookie-consent-modal">
                <div class="cookie-consent-header">
                    <h3><span>🍪</span> Cookies & Confidentialité</h3>
                    <p>Nous utilisons des cookies pour améliorer votre expérience et analyser notre trafic. Vous pouvez décider quels cookies vous autorisez.</p>
                </div>
                
                <div id="cookie-options" class="cookie-consent-options">
                    <div class="cookie-option">
                        <div class="cookie-option-label">
                            <span class="cookie-option-title">Nécessaires</span>
                            <span class="cookie-option-desc">Indispensables au bon fonctionnement du site.</span>
                        </div>
                        <label class="cookie-toggle">
                            <span class="sr-only">Activer les cookies nécessaires</span>
                            <input type="checkbox" checked disabled aria-label="Cookies nécessaires">
                            <span class="cookie-slider"></span>
                        </label>
                    </div>
                    
                    <div class="cookie-option">
                        <div class="cookie-option-label">
                            <span class="cookie-option-title">Analytiques</span>
                            <span class="cookie-option-desc">Nous aident à comprendre comment vous utilisez le site.</span>
                        </div>
                        <label class="cookie-toggle">
                            <span class="sr-only">Activer les cookies analytiques</span>
                            <input type="checkbox" id="consent-analytics" ${this.consent?.analytics ? 'checked' : ''} aria-label="Cookies analytiques">
                            <span class="cookie-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="cookie-consent-actions">
                    <button id="btn-accept-all" class="cookie-btn cookie-btn-accept">Tout Accepter</button>
                    <button id="btn-reject-all" class="cookie-btn cookie-btn-outline">Tout Refuser</button>
                    <button id="btn-customize" class="cookie-btn cookie-btn-outline" style="border: none; font-size: 0.85rem; padding: 5px;">Personnaliser</button>
                    <button id="btn-save-prefs" class="cookie-btn cookie-btn-accept" style="display: none;">Enregistrer mes préférences</button>
                </div>

                <div class="cookie-links">
                    <a href="/pages/confidentialite.html">Politique de confidentialité</a>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.modal = document.getElementById('cookie-consent-modal');

        this.attachListeners();

        // Show if no consent yet
        if (!this.consent) {
            setTimeout(() => this.modal.classList.add('active'), 1000);
        }
    }

    attachListeners() {
        const btnAcceptAll = document.getElementById('btn-accept-all');
        const btnRejectAll = document.getElementById('btn-reject-all');
        const btnCustomize = document.getElementById('btn-customize');
        const btnSavePrefs = document.getElementById('btn-save-prefs');
        const optionsContainer = document.getElementById('cookie-options');

        btnAcceptAll.addEventListener('click', () => {
            this.saveConsent({ analytics: true, marketing: true });
            this.close();
        });

        btnRejectAll.addEventListener('click', () => {
            this.saveConsent({ analytics: false, marketing: false });
            this.close();
        });

        btnCustomize.addEventListener('click', () => {
            optionsContainer.classList.add('show');
            btnAcceptAll.style.display = 'none';
            btnRejectAll.style.display = 'none';
            btnCustomize.style.display = 'none';
            btnSavePrefs.style.display = 'block';
        });

        btnSavePrefs.addEventListener('click', () => {
            const analytics = document.getElementById('consent-analytics').checked;
            this.saveConsent({ analytics });
            this.close();
        });
    }

    showManager() {
        if (!this.modal) this.render();

        // Reset UI to 'customize' state
        document.getElementById('cookie-options').classList.add('show');
        document.getElementById('btn-accept-all').style.display = 'none';
        document.getElementById('btn-reject-all').style.display = 'none';
        document.getElementById('btn-customize').style.display = 'none';
        document.getElementById('btn-save-prefs').style.display = 'block';

        // Update checkboxes
        if (this.consent) {
            document.getElementById('consent-analytics').checked = this.consent.analytics;
        }

        this.modal.classList.add('active');
    }

    close() {
        this.modal.classList.remove('active');
    }
}

// Initialize
const cookieConsent = new CookieConsent();
