/**
 * ModernWeb Dashboard - Module d'authentification
 * Gère la connexion, déconnexion et protection des routes
 */

const AdminAuth = (function () {
    'use strict';

    let supabaseClient = null;
    const ALLOWED_ADMIN_EMAILS = ['milan.led@icloud.com', 'milann.lede@icloud.com'];
    const SESSION_KEY = 'mw_admin_session';

    /**
     * Initialise le client Supabase
     */
    function init() {
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(
                SUPABASE_CONFIG.URL,
                SUPABASE_CONFIG.KEY
            );
            console.log('AdminAuth: Supabase initialisé');
        } else {
            console.error('AdminAuth: SDK Supabase non chargé');
        }
    }

    /**
     * Connexion avec email et mot de passe via Supabase Auth (sécurisé)
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function login(email, password) {
        if (!supabaseClient) {
            return { success: false, error: 'Service non disponible' };
        }

        // Vérification email autorisé
        if (!isAllowedAdminEmail(email)) {
            return { success: false, error: 'Accès non autorisé' };
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('Erreur login:', error.message);
                return { success: false, error: 'Email ou mot de passe incorrect' };
            }

            if (data.session) {
                // Stocker l'info de session (pas le token sensible)
                setLocalSession(data.user.email);
                return { success: true };
            }

            return { success: false, error: 'Erreur de connexion' };
        } catch (err) {
            console.error('Erreur login:', err);
            return { success: false, error: 'Erreur de connexion' };
        }
    }

    /**
     * Déconnexion
     * @returns {Promise<void>}
     */
    async function logout() {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = 'login.html';
    }

    /**
     * Vérifie si l'utilisateur est authentifié
     * @returns {Promise<boolean>}
     */
    async function isAuthenticated() {
        if (!supabaseClient) return false;

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (!session) {
                // Si une session locale fallback existe, on l'accepte
                if (hasLocalSession()) {
                    return true;
                }
                sessionStorage.removeItem(SESSION_KEY);
                return false;
            }

            // Vérifier que c'est bien l'admin
            if (!isAllowedAdminEmail(session.user.email)) {
                await logout();
                return false;
            }

            return true;
        } catch (err) {
            console.error('Erreur vérification auth:', err);
            return hasLocalSession();
        }
    }

    /**
     * Protège une page - redirige vers login si non authentifié
     * @returns {Promise<boolean>}
     */
    async function requireAuth() {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    /**
     * Récupère l'utilisateur courant
     * @returns {Promise<object|null>}
     */
    async function getCurrentUser() {
        if (!supabaseClient) return null;

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            return user;
        } catch (err) {
            return null;
        }
    }

    /**
     * Change le mot de passe
     * @param {string} newPassword
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function changePassword(newPassword) {
        if (!supabaseClient) {
            return { success: false, error: 'Service non disponible' };
        }

        if (!newPassword || newPassword.length < 8) {
            return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
        }

        try {
            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                console.error('Erreur changement mdp:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (err) {
            console.error('Erreur changement mdp:', err);
            return { success: false, error: 'Erreur lors du changement de mot de passe' };
        }
    }

    /**
     * Retourne le client Supabase pour les autres modules
     * @returns {object|null}
     */
    function getClient() {
        return supabaseClient;
    }

    function setLocalSession(email) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            email,
            loggedAt: new Date().toISOString()
        }));
    }

    function hasLocalSession() {
        const data = sessionStorage.getItem(SESSION_KEY);
        if (!data) return false;
        try {
            const parsed = JSON.parse(data);
            return isAllowedAdminEmail(parsed.email);
        } catch (e) {
            return false;
        }
    }

    function isAllowedAdminEmail(email) {
        const normalized = email?.toLowerCase();
        return !!normalized && ALLOWED_ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
    }

    // Initialisation automatique
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API publique
    return {
        login,
        logout,
        isAuthenticated,
        requireAuth,
        getCurrentUser,
        changePassword,
        getClient
    };
})();

// Export global
window.AdminAuth = AdminAuth;
