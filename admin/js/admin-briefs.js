/**
 * ModernWeb Dashboard - Module de gestion des briefs clients (PDF)
 */

const BriefsManager = (function () {
    'use strict';

    let briefs = [];
    const tableBody = document.getElementById('briefsTableBody');
    const emptyState = document.getElementById('briefsEmpty');

    /**
     * Initialise le module
     */
    function init() {
        setupEventListeners();
        loadBriefs();
    }

    /**
     * Configure les écouteurs d'événements
     */
    function setupEventListeners() {
        // Filtres
        document.getElementById('filterBriefStatus')?.addEventListener('change', filterBriefs);
        document.getElementById('searchBriefs')?.addEventListener('input', debounce(filterBriefs, 300));
    }

    /**
     * Charge les briefs depuis Supabase
     */
    async function loadBriefs() {
        const client = AdminAuth.getClient();
        if (!client) return;

        try {
            const { data, error } = await client
                .from('client_briefs')
                .select('*')
                .order('submitted_at', { ascending: false });

            if (error) throw error;

            briefs = data || [];
            renderBriefs(briefs);
            updateStats();
            updateNavBadge();

        } catch (err) {
            console.error('Erreur chargement briefs:', err);
            Toast.error('Erreur', 'Impossible de charger les briefs');
        }
    }

    /**
     * Affiche les briefs dans le tableau
     */
    function renderBriefs(data) {
        if (!tableBody) return;

        if (!data.length) {
            tableBody.innerHTML = '';
            emptyState && (emptyState.hidden = false);
            return;
        }

        emptyState && (emptyState.hidden = true);

        tableBody.innerHTML = data.map(brief => `
            <tr data-id="${brief.id}">
                <td>
                    <div class="brief-client">
                        <div class="client-name">${escapeHtml(brief.client_name)}</div>
                        ${brief.client_email ? `<div class="client-email">${escapeHtml(brief.client_email)}</div>` : ''}
                    </div>
                </td>
                <td>${escapeHtml(brief.project_type || 'Non spécifié')}</td>
                <td>
                    <div class="file-info">
                        <i class="fas fa-file-pdf"></i>
                        <a href="${brief.pdf_url}" target="_blank" class="text-truncate">Voir PDF</a>
                    </div>
                </td>
                <td>${formatDate(brief.submitted_at)}</td>
                <td>
                    <span class="badge badge-${getStatusBadge(brief.status)}">
                        ${getStatusLabel(brief.status)}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <a href="${brief.pdf_url}" target="_blank" class="action-btn download" title="Voir PDF">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                        <button type="button" class="action-btn edit" title="Marquer comme consulté" onclick="event.preventDefault(); event.stopPropagation(); BriefsManager.updateStatus('${brief.id}', 'consulte')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button type="button" class="action-btn view" title="Archiver" onclick="event.preventDefault(); event.stopPropagation(); BriefsManager.updateStatus('${brief.id}', 'archive')">
                            <i class="fas fa-archive"></i>
                        </button>
                        <button type="button" class="action-btn delete" title="Supprimer" onclick="event.preventDefault(); event.stopPropagation(); BriefsManager.deleteBrief('${brief.id}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Filtre les briefs
     */
    function filterBriefs() {
        const status = document.getElementById('filterBriefStatus')?.value || '';
        const search = document.getElementById('searchBriefs')?.value.toLowerCase() || '';

        let filtered = [...briefs];

        if (status) {
            filtered = filtered.filter(b => b.status === status);
        }

        if (search) {
            filtered = filtered.filter(b =>
                b.client_name.toLowerCase().includes(search) ||
                (b.client_email && b.client_email.toLowerCase().includes(search)) ||
                (b.project_type && b.project_type.toLowerCase().includes(search))
            );
        }

        renderBriefs(filtered);
    }

    /**
     * Télécharge un brief PDF
     */
    async function download(briefId) {
        const brief = briefs.find(b => b.id === briefId);
        if (!brief || !brief.pdf_url) return;

        // Ouvrir le PDF dans un nouvel onglet
        window.open(brief.pdf_url, '_blank');

        // Marquer comme consulté si nouveau
        if (brief.status === 'nouveau') {
            await updateStatus(briefId, 'consulte', false);
        }
    }

    /**
     * Met à jour le statut d'un brief
     */
    async function updateStatus(briefId, newStatus, showToast = true) {
        const client = AdminAuth.getClient();
        if (!client) return;

        try {
            const updateData = { status: newStatus };

            const { error } = await client
                .from('client_briefs')
                .update(updateData)
                .eq('id', briefId);

            if (error) throw error;

            if (showToast) {
                Toast.success('Succès', 'Statut mis à jour');
            }

            loadBriefs();

        } catch (err) {
            console.error('Erreur mise à jour statut:', err);
            Toast.error('Erreur', 'Impossible de mettre à jour le statut');
        }
    }

    /**
     * Met à jour les statistiques
     */
    function updateStats() {
        const totalCount = briefs.length;
        const newCount = briefs.filter(b => b.status === 'nouveau').length;

        const statBriefs = document.getElementById('statBriefs');
        if (statBriefs) statBriefs.textContent = totalCount;
    }

    /**
     * Met à jour le badge dans la navigation
     */
    function updateNavBadge() {
        const newCount = briefs.filter(b => b.status === 'nouveau').length;
        const badge = document.getElementById('newBriefsCount');

        if (badge) {
            badge.textContent = newCount;
            // Force hide/show explicitly with style to avoid CSS overrides
            badge.style.display = newCount > 0 ? 'inline-flex' : 'none';
        }
    }

    /**
     * Supprime un brief (Base de données + Fichier Storage)
     */
    async function deleteBrief(briefId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce brief ?\nCette action est irréversible et supprimera également le PDF associé.')) {
            return;
        }

        const client = AdminAuth.getClient();
        if (!client) return;

        try {
            // 1. Récupérer l'URL du PDF pour le supprimer du Storage
            const { data: brief, error: fetchError } = await client
                .from('client_briefs')
                .select('pdf_url')
                .eq('id', briefId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Supprimer le fichier du Storage si l'URL existe
            if (brief && brief.pdf_url) {
                try {
                    // Extraction du chemin relatif depuis l'URL
                    // Ex: .../briefs/nom_fichier.pdf
                    const urlParts = brief.pdf_url.split('/briefs/');
                    if (urlParts.length > 1) {
                        const fileName = urlParts[1];
                        const { error: storageError } = await client.storage
                            .from('project-images')
                            .remove([`briefs/${fileName}`]);

                        if (storageError) console.warn('Erreur suppression storage:', storageError);
                    }
                } catch (storageErr) {
                    console.warn('Erreur lors du traitement du chemin storage:', storageErr);
                }
            }

            // 3. Supprimer l'enregistrement en base de données
            const { error: deleteError } = await client
                .from('client_briefs')
                .delete()
                .eq('id', briefId);

            if (deleteError) throw deleteError;

            Toast.success('Succès', 'Brief et PDF supprimés');
            loadBriefs(); // Recharger la liste

        } catch (err) {
            console.error('Erreur suppression brief:', err);
            Toast.error('Erreur', 'Impossible de supprimer le brief');
        }
    }

    // Utilitaires
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
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getStatusLabel(status) {
        const labels = {
            nouveau: 'Nouveau',
            consulte: 'Consulté',
            archive: 'Archivé'
        };
        return labels[status] || status;
    }

    function getStatusBadge(status) {
        const badges = {
            nouveau: 'danger',
            consulte: 'info',
            archive: 'secondary'
        };
        return badges[status] || 'secondary';
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
        loadBriefs,
        download,
        updateStatus,
        deleteBrief
    };
})();

window.BriefsManager = BriefsManager;
