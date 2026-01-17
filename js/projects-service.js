/**
 * ModernWeb - Service de récupération des projets
 * Charge les projets publiés depuis Supabase pour le site public
 */

const ProjectsService = (function () {
    'use strict';

    let supabaseClient = null;
    let cachedProjects = null;

    /**
     * Initialise le client Supabase
     */
    function init() {
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(
                SUPABASE_CONFIG.URL,
                SUPABASE_CONFIG.KEY
            );
        }
    }

    /**
     * Récupère tous les projets publiés OU mis en avant
     * @returns {Promise<Array>}
     */
    async function getPublishedProjects() {
        if (!supabaseClient) {
            init();
            if (!supabaseClient) {
                console.warn('ProjectsService: Supabase non disponible');
                return [];
            }
        }

        try {
            // Récupère les projets publiés OU mis en avant (featured)
            const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .or('status.eq.publie,featured.eq.true')
                .order('featured', { ascending: false }) // Featured en premier
                .order('project_date', { ascending: false });

            if (error) throw error;

            cachedProjects = data || [];
            return cachedProjects;

        } catch (err) {
            console.error('Erreur chargement projets:', err);
            return cachedProjects || [];
        }
    }

    /**
     * Récupère les projets mis en avant
     * @returns {Promise<Array>}
     */
    async function getFeaturedProjects() {
        const projects = await getPublishedProjects();
        return projects.filter(p => p.featured);
    }

    /**
     * Récupère les projets par catégorie
     * @param {string} category
     * @returns {Promise<Array>}
     */
    async function getProjectsByCategory(category) {
        const projects = await getPublishedProjects();
        return projects.filter(p => p.category === category);
    }

    /**
     * Récupère un projet par son slug
     * @param {string} slug
     * @returns {Promise<object|null>}
     */
    async function getProjectBySlug(slug) {
        const projects = await getPublishedProjects();
        return projects.find(p => p.slug === slug) || null;
    }

    /**
     * Génère le HTML d'une carte projet
     * @param {object} project
     * @returns {string}
     */
    function renderProjectCard(project) {
        const themeClass = project.theme && project.theme !== 'default' ? `project-${project.theme}` : '';
        const projectTypeLabel = getProjectTypeLabel(project.project_type);

        return `
            <article class="premium-project-card ${themeClass}" data-category="${project.project_type || 'autre'}">
                <div class="premium-project-content">
                    <span class="premium-project-category">${projectTypeLabel}</span>
                    <h3 class="premium-project-title">${escapeHtml(project.title)}</h3>
                    ${project.technologies && project.technologies.length
                ? `<div class="premium-project-features">
                            ${project.technologies.slice(0, 3).map(tech =>
                    `<span class="feature-tag">${escapeHtml(tech)}</span>`
                ).join('')}
                           </div>`
                : ''
            }
                    <p class="premium-project-desc">${escapeHtml(project.short_desc || project.description || '')}</p>
                    <div class="project-actions">
                        ${project.link
                ? `<a href="${project.link}" target="_blank" class="btn btn-primary">Découvrir le projet <i class="fas fa-arrow-right ml-2"></i></a>`
                : '<span class="btn btn-outline disabled">Bientôt disponible</span>'
            }
                    </div>
                </div>
                <div class="premium-project-image">
                    ${project.cover_image
                ? `<img src="${project.cover_image}" alt="${escapeHtml(project.title)}" loading="lazy">`
                : `<div class="project-placeholder" style="display:flex;align-items:center;justify-content:center;height:100%;min-height:300px;background:#f1f5f9;border-radius:16px;">
                        <i class="fas fa-image fa-3x" style="color:#cbd5e1;"></i>
                   </div>`
            }
                </div>
            </article>
        `;
    }

    // Utilitaires
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getProjectTypeLabel(projectType) {
        const labels = {
            site_vitrine: 'Site Vitrine',
            ecommerce: 'E-commerce',
            portfolio: 'Portfolio',
            gaming: 'Site Gaming',
            application: 'Application Web',
            immobilier: 'Immobilier',
            autre: 'Projet Web'
        };
        return labels[projectType] || 'Projet';
    }

    function getCategoryLabel(category) {
        const labels = {
            nature: 'Nature',
            tech: 'Tech',
            gaming: 'Gaming',
            construction: 'Construction',
            autre: 'Autre'
        };
        return labels[category] || 'Projet';
    }

    // Initialisation automatique
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API publique
    return {
        getPublishedProjects,
        getFeaturedProjects,
        getProjectsByCategory,
        getProjectBySlug,
        renderProjectCard
    };
})();

window.ProjectsService = ProjectsService;
