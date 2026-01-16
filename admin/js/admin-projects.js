/**
 * ModernWeb Dashboard - Module de gestion des projets
 * CRUD complet pour les projets du portfolio
 */

const ProjectsManager = (function () {
    'use strict';

    let projects = [];
    let currentProjectId = null;
    let thumbnailFile = null;

    // Éléments DOM
    const modal = document.getElementById('projectModal');
    const deleteModal = document.getElementById('deleteModal');
    const form = document.getElementById('projectForm');
    const tableBody = document.getElementById('projectsTableBody');
    const emptyState = document.getElementById('projectsEmpty');

    // Champs du formulaire
    const fields = {
        id: document.getElementById('projectId'),
        name: document.getElementById('projectName'),
        slug: document.getElementById('projectSlug'),
        clientType: document.getElementById('projectClientType'),
        projectType: document.getElementById('projectType'),
        category: document.getElementById('projectCategory'),
        shortDesc: document.getElementById('projectShortDesc'),
        fullDesc: document.getElementById('projectFullDesc'),
        technologies: document.getElementById('projectTechnologies'),
        date: document.getElementById('projectDate'),
        status: document.getElementById('projectStatus'),
        link: document.getElementById('projectLink'),
        thumbnail: document.getElementById('projectThumbnail'),
        featured: document.getElementById('projectFeatured')
    };

    // Détection automatique du thème basée sur le type de projet et les mots-clés
    function detectAutoTheme(projectType, title, description) {
        const text = `${title} ${description}`.toLowerCase();

        // Règles de détection basées sur le type de projet
        const typeThemeMap = {
            'ecommerce': 'tech',
            'gaming': 'gaming',
            'site_vitrine': 'nature',
            'portfolio': 'tech',
            'application': 'tech',
            'immobilier': 'default'
        };

        // Détection par mots-clés dans le titre/description
        const keywordThemes = [
            { keywords: ['jardin', 'bio', 'nature', 'plante', 'vert', 'eco', 'éco', 'agricole', 'ferme'], theme: 'nature' },
            { keywords: ['game', 'gaming', 'jeu', 'esport', 'néon', 'cyber'], theme: 'gaming' },
            { keywords: ['tech', 'digital', 'planner', 'app', 'saas', 'startup', 'business'], theme: 'tech' }
        ];

        // Vérifier les mots-clés d'abord (plus spécifique)
        for (const rule of keywordThemes) {
            if (rule.keywords.some(kw => text.includes(kw))) {
                return rule.theme;
            }
        }

        // Sinon utiliser le type de projet
        return typeThemeMap[projectType] || 'default';
    }

    /**
     * Initialise le module
     */
    function init() {
        setupEventListeners();
        loadProjects();
    }

    /**
     * Configure les écouteurs d'événements
     */
    function setupEventListeners() {
        // Boutons d'ouverture modal
        document.getElementById('addProjectBtn')?.addEventListener('click', () => openModal());
        document.getElementById('addProjectEmptyBtn')?.addEventListener('click', () => openModal());

        // Modal
        document.getElementById('projectModalClose')?.addEventListener('click', closeModal);
        document.getElementById('projectModalCancel')?.addEventListener('click', closeModal);
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Formulaire
        form?.addEventListener('submit', handleSubmit);

        // Génération automatique du slug
        fields.name?.addEventListener('input', () => {
            if (!fields.slug.value || fields.slug.dataset.auto === 'true') {
                fields.slug.value = generateSlug(fields.name.value);
                fields.slug.dataset.auto = 'true';
            }
        });

        fields.slug?.addEventListener('input', () => {
            fields.slug.dataset.auto = 'false';
        });

        // Upload d'image
        const thumbnailUpload = document.getElementById('thumbnailUpload');
        thumbnailUpload?.addEventListener('click', () => fields.thumbnail.click());
        thumbnailUpload?.addEventListener('dragover', (e) => {
            e.preventDefault();
            thumbnailUpload.classList.add('dragover');
        });
        thumbnailUpload?.addEventListener('dragleave', () => {
            thumbnailUpload.classList.remove('dragover');
        });
        thumbnailUpload?.addEventListener('drop', (e) => {
            e.preventDefault();
            thumbnailUpload.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleThumbnailSelect(e.dataTransfer.files[0]);
            }
        });

        fields.thumbnail?.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleThumbnailSelect(e.target.files[0]);
            }
        });

        // Filtres
        document.getElementById('filterStatus')?.addEventListener('change', filterProjects);
        document.getElementById('filterCategory')?.addEventListener('change', filterProjects);
        document.getElementById('searchProjects')?.addEventListener('input', debounce(filterProjects, 300));

        // Delete modal
        document.getElementById('deleteModalClose')?.addEventListener('click', closeDeleteModal);
        document.getElementById('deleteModalCancel')?.addEventListener('click', closeDeleteModal);
        document.getElementById('deleteModalConfirm')?.addEventListener('click', confirmDelete);
    }

    /**
     * Charge les projets depuis Supabase
     */
    async function loadProjects() {
        const client = AdminAuth.getClient();
        if (!client) return;

        try {
            const { data, error } = await client
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            projects = data || [];
            renderProjects(projects);
            updateStats();
        } catch (err) {
            console.error('Erreur chargement projets:', err);
            Toast.error('Erreur', 'Impossible de charger les projets');
        }
    }

    /**
     * Affiche les projets dans le tableau
     */
    function renderProjects(data) {
        if (!tableBody) return;

        if (!data.length) {
            tableBody.innerHTML = '';
            emptyState && (emptyState.hidden = false);
            return;
        }

        emptyState && (emptyState.hidden = true);

        tableBody.innerHTML = data.map(project => `
            <tr data-id="${project.id}">
                <td>
                    <div class="project-row">
                        ${project.cover_image
                ? `<img src="${project.cover_image}" alt="${project.title}" class="project-thumbnail">`
                : '<div class="project-thumbnail"></div>'
            }
                        <div class="project-info">
                            <div class="project-name">${escapeHtml(project.title)}</div>
                            <div class="project-client-type">${project.client_type === 'professionnel' ? 'Pro' : 'Particulier'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge badge-secondary">
                        ${project.client_type === 'professionnel' ? 'Professionnel' : 'Particulier'}
                    </span>
                </td>
                <td>
                    <span class="badge badge-${getStatusBadge(project.status)}">
                        ${getStatusLabel(project.status)}
                    </span>
                </td>
                <td>${formatDate(project.project_date)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn edit" title="Modifier" onclick="ProjectsManager.edit('${project.id}')">
                            <i class="fas fa-pen"></i>
                        </button>
                        ${project.link ? `
                            <a href="${project.link}" target="_blank" class="action-btn view" title="Voir le site">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                        <button class="action-btn delete" title="Supprimer" onclick="ProjectsManager.delete('${project.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Filtre les projets
     */
    function filterProjects() {
        const status = document.getElementById('filterStatus')?.value || '';
        const category = document.getElementById('filterCategory')?.value || '';
        const search = document.getElementById('searchProjects')?.value.toLowerCase() || '';

        let filtered = [...projects];

        if (status) {
            filtered = filtered.filter(p => p.status === status);
        }

        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }

        if (search) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(search) ||
                (p.short_description && p.short_description.toLowerCase().includes(search))
            );
        }

        renderProjects(filtered);
    }

    /**
     * Ouvre le modal de création/édition
     */
    function openModal(projectId = null) {
        currentProjectId = projectId;
        thumbnailFile = null;

        const modalTitle = document.getElementById('projectModalTitle');
        const thumbnailPreview = document.getElementById('thumbnailPreview');

        if (projectId) {
            // Mode édition - convertir l'ID en nombre pour la comparaison
            const numericId = Number(projectId);
            const project = projects.find(p => p.id === numericId || p.id === projectId);
            if (!project) {
                console.error('Projet non trouvé:', projectId, 'dans', projects.map(p => p.id));
                return;
            }

            modalTitle.textContent = 'Modifier le projet';
            populateForm(project);

            if (project.cover_image) {
                showThumbnailPreview(project.cover_image);
            }
        } else {
            // Mode création
            modalTitle.textContent = 'Nouveau projet';
            form.reset();
            fields.slug.dataset.auto = 'true';
            thumbnailPreview && (thumbnailPreview.hidden = true);
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Ferme le modal
     */
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        currentProjectId = null;
        thumbnailFile = null;
    }

    /**
     * Remplit le formulaire avec les données d'un projet
     */
    function populateForm(project) {
        fields.id.value = project.id;
        fields.name.value = project.title || '';
        fields.slug.value = '';
        fields.slug.dataset.auto = 'true';
        fields.clientType.value = project.client_type || 'particulier';
        fields.projectType.value = project.project_type || 'site_vitrine';
        fields.category.value = project.theme || 'auto';
        fields.shortDesc.value = project.short_desc || '';
        fields.fullDesc.value = project.description || '';
        fields.technologies.value = (project.technologies || []).join(', ');
        fields.date.value = project.project_date || '';
        fields.status.value = project.status || 'en_cours';
        fields.link.value = project.link || '';
        fields.featured.checked = project.featured || false;
    }

    /**
     * Gère la sélection d'une image
     */
    function handleThumbnailSelect(file) {
        if (!file.type.startsWith('image/')) {
            Toast.error('Erreur', 'Veuillez sélectionner une image');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            Toast.error('Erreur', 'L\'image ne doit pas dépasser 5 Mo');
            return;
        }

        thumbnailFile = file;

        const reader = new FileReader();
        reader.onload = (e) => showThumbnailPreview(e.target.result);
        reader.readAsDataURL(file);
    }

    /**
     * Affiche la prévisualisation de l'image
     */
    function showThumbnailPreview(src) {
        const preview = document.getElementById('thumbnailPreview');
        if (!preview) return;

        preview.innerHTML = `
            <img src="${src}" alt="Prévisualisation">
            <button type="button" class="remove-btn" onclick="ProjectsManager.removeThumbnail()">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.hidden = false;
    }

    /**
     * Supprime l'image sélectionnée
     */
    function removeThumbnail() {
        thumbnailFile = null;
        const preview = document.getElementById('thumbnailPreview');
        if (preview) preview.hidden = true;
        if (fields.thumbnail) fields.thumbnail.value = '';
    }

    /**
     * Gère la soumission du formulaire
     */
    async function handleSubmit(e) {
        e.preventDefault();

        const client = AdminAuth.getClient();
        if (!client) {
            Toast.error('Erreur', 'Non connecté');
            return;
        }

        const saveBtn = document.getElementById('projectModalSave');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

        try {
            let thumbnailUrl = null;

            // Upload de l'image si présente
            if (thumbnailFile) {
                const fileExt = thumbnailFile.name.split('.').pop();
                const fileName = `${fields.slug.value || 'project'}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await client.storage
                    .from('project-images')
                    .upload(fileName, thumbnailFile);

                if (!uploadError) {
                    const { data: { publicUrl } } = client.storage
                        .from('project-images')
                        .getPublicUrl(fileName);
                    thumbnailUrl = publicUrl;
                }
            }

            // Déterminer le thème (auto ou manuel)
            let themeValue = fields.category.value;
            if (themeValue === 'auto') {
                themeValue = detectAutoTheme(
                    fields.projectType.value,
                    fields.name.value,
                    fields.shortDesc.value + ' ' + fields.fullDesc.value
                );
            }

            // Préparer les données (colonnes SQL)
            const projectData = {
                title: fields.name.value.trim(),
                client_type: fields.clientType.value,
                project_type: fields.projectType.value,
                theme: themeValue,
                short_desc: fields.shortDesc.value.trim(),
                description: fields.fullDesc.value.trim(),
                technologies: fields.technologies.value.split(',').map(t => t.trim()).filter(Boolean),
                project_date: fields.date.value || null,
                status: fields.status.value,
                link: fields.link.value.trim() || null,
                featured: fields.featured.checked
            };

            if (thumbnailUrl) {
                projectData.cover_image = thumbnailUrl;
            }

            let result;

            if (currentProjectId) {
                // Mise à jour
                result = await client
                    .from('projects')
                    .update(projectData)
                    .eq('id', currentProjectId)
                    .select();
            } else {
                // Création
                result = await client
                    .from('projects')
                    .insert([projectData])
                    .select();
            }

            if (result.error) throw result.error;

            Toast.success('Succès', currentProjectId ? 'Projet mis à jour' : 'Projet créé');
            closeModal();
            loadProjects();

        } catch (err) {
            console.error('Erreur sauvegarde projet:', err);
            Toast.error('Erreur', err.message || 'Impossible de sauvegarder le projet');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
        }
    }

    /**
     * Ouvre le modal d'édition
     */
    function edit(projectId) {
        openModal(projectId);
    }

    /**
     * Demande confirmation de suppression
     */
    function deleteProject(projectId) {
        currentProjectId = projectId;
        const project = projects.find(p => p.id === projectId);

        if (project) {
            document.getElementById('deleteModalText').textContent =
                `Êtes-vous sûr de vouloir supprimer "${project.name}" ?`;
        }

        deleteModal.classList.add('active');
    }

    /**
     * Ferme le modal de suppression
     */
    function closeDeleteModal() {
        deleteModal.classList.remove('active');
        currentProjectId = null;
    }

    /**
     * Confirme la suppression
     */
    async function confirmDelete() {
        if (!currentProjectId) return;

        const client = AdminAuth.getClient();
        if (!client) return;

        try {
            const { error } = await client
                .from('projects')
                .delete()
                .eq('id', currentProjectId);

            if (error) throw error;

            Toast.success('Succès', 'Projet supprimé');
            closeDeleteModal();
            loadProjects();

        } catch (err) {
            console.error('Erreur suppression:', err);
            Toast.error('Erreur', 'Impossible de supprimer le projet');
        }
    }

    /**
     * Met à jour les statistiques
     */
    function updateStats() {
        const publishedCount = projects.filter(p => p.status === 'publie').length;
        const pendingCount = projects.filter(p => p.status === 'en_cours').length;

        const statProjects = document.getElementById('statProjects');
        const statPending = document.getElementById('statPending');

        if (statProjects) statProjects.textContent = publishedCount;
        if (statPending) statPending.textContent = pendingCount;

        // Derniers projets
        renderRecentProjects();
    }

    /**
     * Affiche les derniers projets sur le dashboard
     */
    function renderRecentProjects() {
        const container = document.getElementById('recentProjects');
        if (!container) return;

        const recent = projects.slice(0, 5);

        if (!recent.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Aucun projet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.map(project => `
            <div class="recent-project-item">
                ${project.cover_image
                ? `<img src="${project.cover_image}" alt="${project.title}" class="recent-project-thumb">`
                : '<div class="recent-project-thumb"></div>'
            }
                <div class="recent-project-info">
                    <div class="recent-project-name">${escapeHtml(project.title)}</div>
                    <div class="recent-project-date">${formatDate(project.created_at)}</div>
                </div>
                <span class="badge badge-${getStatusBadge(project.status)}">
                    ${getStatusLabel(project.status)}
                </span>
            </div>
        `).join('');
    }

    /**
     * Retourne tous les projets publiés (pour le site public)
     */
    function getPublishedProjects() {
        return projects.filter(p => p.status === 'publie');
    }

    // Utilitaires
    function generateSlug(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    function getStatusLabel(status) {
        const labels = {
            en_cours: 'En cours',
            termine: 'Terminé',
            publie: 'Publié'
        };
        return labels[status] || status;
    }

    function getStatusBadge(status) {
        const badges = {
            en_cours: 'warning',
            termine: 'info',
            publie: 'success'
        };
        return badges[status] || 'secondary';
    }

    function getCategoryBadge(category) {
        const badges = {
            nature: 'success',
            tech: 'primary',
            gaming: 'info',
            construction: 'warning'
        };
        return badges[category] || 'secondary';
    }

    function debounce(fn, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    }

    // API publique
    return {
        init,
        loadProjects,
        edit,
        delete: deleteProject,
        removeThumbnail,
        getPublishedProjects
    };
})();

window.ProjectsManager = ProjectsManager;
