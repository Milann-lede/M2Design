/**
 * ModernWeb Dashboard - Page de connexion
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');
    const togglePasswordBtn = document.querySelector('.toggle-password');

    // Si déjà connecté, rediriger vers le dashboard
    checkExistingSession();

    // Toggle visibilité mot de passe
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePasswordBtn.innerHTML = type === 'password' 
            ? '<i class="fas fa-eye"></i>' 
            : '<i class="fas fa-eye-slash"></i>';
    });

    // Soumission formulaire
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Veuillez remplir tous les champs');
            return;
        }

        // UI loading
        setLoading(true);
        hideError();

        // Tentative de connexion
        const result = await AdminAuth.login(email, password);

        if (result.success) {
            // Redirection vers le dashboard
            window.location.href = 'index.html';
        } else {
            showError(result.error || 'Erreur de connexion');
            setLoading(false);
        }
    });

    /**
     * Vérifie si une session existe déjà
     */
    async function checkExistingSession() {
        const authenticated = await AdminAuth.isAuthenticated();
        if (authenticated) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Affiche une erreur
     */
    function showError(message) {
        errorText.textContent = message;
        errorDiv.hidden = false;
    }

    /**
     * Cache l'erreur
     */
    function hideError() {
        errorDiv.hidden = true;
    }

    /**
     * Active/désactive l'état loading
     */
    function setLoading(loading) {
        loginBtn.disabled = loading;
        btnText.hidden = loading;
        btnLoader.hidden = !loading;
        emailInput.disabled = loading;
        passwordInput.disabled = loading;
    }
});
