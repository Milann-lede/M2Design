/**
 * ModernWeb Dashboard - Système de notifications toast
 */

const Toast = (function() {
    'use strict';

    const container = document.getElementById('toastContainer');
    const DURATION = 5000;

    /**
     * Affiche une notification toast
     * @param {string} type - Type: success, error, warning, info
     * @param {string} title - Titre de la notification
     * @param {string} message - Message détaillé
     */
    function show(type, title, message = '') {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Bouton fermer
        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });

        // Auto-fermeture
        setTimeout(() => {
            removeToast(toast);
        }, DURATION);
    }

    /**
     * Supprime un toast avec animation
     */
    function removeToast(toast) {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Raccourcis
    function success(title, message) { show('success', title, message); }
    function error(title, message) { show('error', title, message); }
    function warning(title, message) { show('warning', title, message); }
    function info(title, message) { show('info', title, message); }

    return { show, success, error, warning, info };
})();

// Style pour animation de sortie
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

window.Toast = Toast;
