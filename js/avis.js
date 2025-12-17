// Logique spécifique à la page d'avis
document.addEventListener('DOMContentLoaded', async () => {
    const reviewsList = document.getElementById('reviews-list');
    const reviewForm = document.getElementById('review-form');

    // Fonction pour afficher un avis
    function createReviewElement(review) {
        const div = document.createElement('article');
        div.className = 'review-item fade-in-up';

        const stars = Array(5).fill(0).map((_, i) =>
            `<i class="${i < review.rating ? 'fas' : 'far'} fa-star"></i>`
        ).join('');

        const date = new Date(review.created_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Avatar logic
        let avatarHtml = '';
        if (review.avatar_url) {
            avatarHtml = `<img src="${review.avatar_url}" alt="${review.name}" style="width: 50px; height: 50px; min-width: 50px; min-height: 50px; border-radius: 50%; object-fit: cover; margin-right: 15px; flex-shrink: 0;" onerror="this.onerror=null; this.parentNode.innerHTML='<div style=\'width: 50px; height: 50px; min-width: 50px; min-height: 50px; border-radius: 50%; background: #F8FAFC; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;\'><img src=\'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23CBD5E1\'%3E%3Cpath d=\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\'/%3E%3C/svg%3E\' style=\'width: 60%; height: 60%; object-fit: contain; opacity: 0.8;\'></div>'">`;
        } else {
            // Fallback avatar (Silhouette noir et blanc)
            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23CBD5E1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
            avatarHtml = `<div style="width: 50px; height: 50px; min-width: 50px; min-height: 50px; border-radius: 50%; background: #F8FAFC; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;"><img src="${defaultAvatar}" alt="Default Avatar" style="width: 60%; height: 60%; object-fit: contain; opacity: 0.8;"></div>`;
        }

        div.innerHTML = `
            <div class="review-header">
                <div style="display: flex; align-items: center;">
                    ${avatarHtml}
                    <div class="review-author">
                        <h4>${review.name}</h4>
                        ${review.role ? `<span class="review-role">${review.role}</span>` : ''}
                    </div>
                </div>
                <div class="review-stars">${stars}</div>
            </div>
            <p class="review-content">${review.message}</p>
            <span class="review-date">Posté le ${date}</span>
        `;
        return div;
    }

    // Charger les avis existants
    const { data: reviews, error } = await SupabaseService.getReviews();

    if (error) {
        reviewsList.innerHTML = `<p class="text-center text-danger">Erreur lors du chargement des avis. Veuillez vérifier la configuration.</p>`;
        console.error(error);
    } else {
        reviewsList.innerHTML = ''; // Vider le loader
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p class="text-center">Soyez le premier à donner votre avis !</p>';
        } else {
            reviews.forEach(review => {
                reviewsList.appendChild(createReviewElement(review));
            });
        }
    }

    // S'abonner aux nouveaux avis
    SupabaseService.subscribeToReviews((newReview) => {
        // Si c'était vide, on enlève le message "Soyez le premier..."
        if (reviewsList.querySelector('p.text-center')) {
            reviewsList.innerHTML = '';
        }
        // Ajouter le nouvel avis en haut de la liste avec animation
        const newElement = createReviewElement(newReview);
        reviewsList.insertBefore(newElement, reviewsList.firstChild);
    });

    // Gérer la soumission du formulaire
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Envoi en cours...';

            const formData = new FormData(reviewForm);
            const newReview = {
                name: formData.get('name'),
                role: formData.get('role'),
                message: formData.get('message'),
                rating: parseInt(formData.get('rating'))
            };

            const imageFile = formData.get('avatar'); // Récupérer le fichier

            const { data, error } = await SupabaseService.addReview(newReview, imageFile);

            if (error) {
                alert('Erreur lors de l\'envoi de l\'avis : ' + error.message);
            } else {
                // Show success modal
                const modal = document.getElementById('success-modal');
                modal.classList.add('active');

                // Send email notification
                const insertedReview = data[0]; // Get the inserted review data
                const emailParams = {
                    from_name: newReview.name,
                    reply_to: 'no-reply@m2design.fr', // No email collected in review form
                    email: 'no-reply@m2design.fr',
                    subject: `Nouvel Avis Client : ${newReview.rating}/5 ⭐`,
                    type_demande: 'Avis Client',
                    message: `
Nouvel avis reçu sur le site !

👤 Nom : ${newReview.name}
💼 Poste/Entreprise : ${newReview.role || 'Non renseigné'}
⭐ Note : ${newReview.rating}/5

💬 Message :
${newReview.message}

🖼️ Photo : ${insertedReview.avatar_url ? insertedReview.avatar_url : 'Aucune photo'}
                    `
                };

                emailjs.send(EMAILJS_CONFIG.REVIEW_SERVICE_ID, EMAILJS_CONFIG.REVIEW_TEMPLATE_ID, emailParams, EMAILJS_CONFIG.REVIEW_PUBLIC_KEY)
                    .then(() => {
                        console.log('Email de notification envoyé !');
                    })
                    .catch((err) => {
                        console.error('Erreur envoi email:', err);
                    });

                reviewForm.reset();

                // Reset file input style
                const fileNameSpan = document.getElementById('file-name');
                const fileWrapper = document.querySelector('.file-upload-wrapper');
                if (fileNameSpan) fileNameSpan.textContent = 'Choisir une photo';
                if (fileWrapper) {
                    fileWrapper.style.borderColor = '#CBD5E1';
                    fileWrapper.style.background = 'rgba(255, 255, 255, 0.5)';
                }
            }

            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        });

        // Gérer l'affichage du nom de fichier
        const fileInput = document.getElementById('avatar');
        const fileNameSpan = document.getElementById('file-name');
        const fileWrapper = document.querySelector('.file-upload-wrapper');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    fileNameSpan.textContent = e.target.files[0].name;
                    fileWrapper.style.borderColor = 'var(--primary)';
                    fileWrapper.style.background = 'rgba(37, 99, 235, 0.05)';
                } else {
                    fileNameSpan.textContent = 'Choisir une photo';
                    fileWrapper.style.borderColor = '#CBD5E1';
                    fileWrapper.style.background = 'rgba(255, 255, 255, 0.5)';
                }
            });
        }
    }

    // Global function to close modal
    window.closeModal = function () {
        const modal = document.getElementById('success-modal');
        modal.classList.remove('active');
    }
});
