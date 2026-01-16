/**
 * ModernWeb Dashboard - Script principal
 * Gère la navigation, l'initialisation et le comportement global
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier l'authentification
    const isAuth = await AdminAuth.requireAuth();
    if (!isAuth) return;

    // Initialiser les modules
    initNavigation();
    initMobileMenu();
    initLogout();
    initSettings();
    initQuickActions();

    // Charger les données
    ProjectsManager.init();
    BriefsManager.init();
    ReviewsManager.init();

    // Afficher la page initiale
    showPage(getInitialPage());
});

/**
 * Initialise la navigation entre les pages
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);
            
            // Mettre à jour l'URL
            history.pushState({ page }, '', `#${page}`);
        });
    });

    // Gérer le bouton retour du navigateur
    window.addEventListener('popstate', (e) => {
        const page = e.state?.page || 'dashboard';
        showPage(page);
    });
}

/**
 * Affiche une page spécifique
 */
function showPage(pageId) {
    // Masquer toutes les pages
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    // Afficher la page demandée
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Mettre à jour la navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Mettre à jour le titre
    const titles = {
        dashboard: 'Dashboard',
        projects: 'Gestion des projets',
        briefs: 'Briefs clients',
        reviews: 'Avis clients',
        settings: 'Paramètres'
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[pageId] || 'Dashboard';
    }

    // Fermer le menu mobile si ouvert
    closeMobileMenu();
}

/**
 * Détermine la page initiale
 */
function getInitialPage() {
    const hash = window.location.hash.slice(1);
    const validPages = ['dashboard', 'projects', 'briefs', 'reviews', 'settings'];
    return validPages.includes(hash) ? hash : 'dashboard';
}

/**
 * Initialise le menu mobile
 */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    mobileMenuBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay?.addEventListener('click', closeMobileMenu);
}

/**
 * Ferme le menu mobile
 */
function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
}

/**
 * Initialise le bouton de déconnexion
 */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    logoutBtn?.addEventListener('click', async () => {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            await AdminAuth.logout();
        }
    });
}

/**
 * Initialise les paramètres (changement de mot de passe)
 */
function initSettings() {
    const form = document.getElementById('changePasswordForm');
    
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validations
        if (newPassword.length < 8) {
            Toast.error('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
            return;
        }

        if (newPassword !== confirmPassword) {
            Toast.error('Erreur', 'Les mots de passe ne correspondent pas');
            return;
        }

        // Vérifier l'ancien mot de passe en tentant une reconnexion
        const user = await AdminAuth.getCurrentUser();
        if (!user) {
            Toast.error('Erreur', 'Session expirée');
            return;
        }

        const verifyResult = await AdminAuth.login(user.email, currentPassword);
        if (!verifyResult.success) {
            Toast.error('Erreur', 'Mot de passe actuel incorrect');
            return;
        }

        // Changer le mot de passe
        const result = await AdminAuth.changePassword(newPassword);

        if (result.success) {
            Toast.success('Succès', 'Mot de passe modifié');
            form.reset();
        } else {
            Toast.error('Erreur', result.error || 'Impossible de modifier le mot de passe');
        }
    });

    // Afficher la dernière connexion
    const lastLoginEl = document.getElementById('lastLogin');
    if (lastLoginEl) {
        const sessionData = sessionStorage.getItem('mw_admin_session');
        if (sessionData) {
            const { loggedAt } = JSON.parse(sessionData);
            lastLoginEl.textContent = new Date(loggedAt).toLocaleString('fr-FR');
        }
    }
}

/**
 * Initialise les actions rapides
 */
function initQuickActions() {
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;

            switch (action) {
                case 'new-project':
                    showPage('projects');
                    setTimeout(() => ProjectsManager.edit(null), 100);
                    break;
                case 'view-briefs':
                    showPage('briefs');
                    break;
                case 'view-reviews':
                    showPage('reviews');
                    break;
            }
        });
    });
}
