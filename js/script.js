document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. Mobile Menu Toggle
    // ==========================================
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');

            // Toggle icon
            const icon = hamburger.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = hamburger.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // ==========================================
    // 2. Load Reviews for Home Page
    // ==========================================
    loadHomeReviews();

    async function loadHomeReviews() {
        const testimonialsContainer = document.getElementById('home-testimonials');
        if (!testimonialsContainer) return; // Exit if not on home page

        // Helper: Create Review HTML (Matches avis.js style)
        function createReviewElement(review) {
            const div = document.createElement('article');
            div.className = 'review-item fade-in-up';

            // Stars
            const stars = Array(5).fill(0).map((_, i) =>
                `<i class="${i < review.rating ? 'fas' : 'far'} fa-star"></i>`
            ).join('');

            // Date
            const date = new Date(review.created_at).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Avatar
            let avatarHtml = '';
            if (review.avatar_url) {
                avatarHtml = `<img src="${review.avatar_url}" alt="${review.name}" style="width: 50px; height: 50px; min-width: 50px; min-height: 50px; border-radius: 50%; object-fit: cover; margin-right: 15px; flex-shrink: 0;" onerror="this.onerror=null; this.parentNode.innerHTML='<div style=\\'width: 50px; height: 50px; min-width: 50px; min-height: 50px; border-radius: 50%; background: #F8FAFC; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;\\'><img src=\\'data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23CBD5E1\\'%3E%3Cpath d=\\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\\'/%3E%3C/svg%3E\\' style=\\'width: 60%; height: 60%; object-fit: contain; opacity: 0.8;\\'></div>'">`;
            } else {
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

        try {
            if (typeof SupabaseService === 'undefined') {
                console.error("SupabaseService not found.");
                testimonialsContainer.innerHTML = '<p class="text-center text-danger">Erreur: Service indisponible</p>';
                return;
            }

            const { data: reviews, error } = await SupabaseService.getReviews();

            if (error) {
                console.error('Error fetching reviews:', error);
                testimonialsContainer.innerHTML = '<p class="text-center text-danger">Impossible de charger les avis.</p>';
                return;
            }

            testimonialsContainer.innerHTML = ''; // Clear loader

            if (!reviews || reviews.length === 0) {
                testimonialsContainer.innerHTML = '<p class="text-center">Aucun avis pour le moment.</p>';
                return;
            }

            // Display top 3 reviews
            const recentReviews = reviews.slice(0, 3);
            recentReviews.forEach(review => {
                testimonialsContainer.appendChild(createReviewElement(review));
            });

        } catch (err) {
            console.error('Unexpected error loading reviews:', err);
            testimonialsContainer.innerHTML = '<p class="text-center text-danger">Erreur inattendue.</p>';
        }
    }

    function initPortfolioFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const projectCards = document.querySelectorAll('.premium-project-card');
        const mobileFilterToggle = document.querySelector('.mobile-filter-toggle');
        const filterWrapper = document.querySelector('.filter-buttons-wrapper');
        const filterToggleText = mobileFilterToggle ? mobileFilterToggle.querySelector('span') : null;

        // 1. Mobile Toggle Logic
        if (mobileFilterToggle && filterWrapper) {
            mobileFilterToggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent immediate closing
                filterWrapper.classList.toggle('active');
                const icon = mobileFilterToggle.querySelector('.filter-icon-right');
                if (icon) {
                    if (filterWrapper.classList.contains('active')) {
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');
                    } else {
                        icon.classList.add('fa-chevron-down');
                        icon.classList.remove('fa-chevron-up');
                    }
                }
            });

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (!filterWrapper.contains(e.target) && !mobileFilterToggle.contains(e.target)) {
                    filterWrapper.classList.remove('active');
                    const icon = mobileFilterToggle.querySelector('.filter-icon-right');
                    if (icon) {
                        icon.classList.add('fa-chevron-down');
                        icon.classList.remove('fa-chevron-up');
                    }
                }
            });
        }

        // 2. Filter Logic
        if (filterButtons.length > 0 && projectCards.length > 0) {
            filterButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Update Active State
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    // Update Mobile Text
                    if (filterToggleText) {
                        filterToggleText.textContent = button.textContent;
                    }

                    // Close Mobile Menu
                    if (filterWrapper) {
                        filterWrapper.classList.remove('active');
                        const icon = mobileFilterToggle ? mobileFilterToggle.querySelector('.filter-icon-right') : null;
                        if (icon) {
                            icon.classList.add('fa-chevron-down');
                            icon.classList.remove('fa-chevron-up');
                        }
                    }

                    // Filter Items
                    const filter = button.getAttribute('data-filter');

                    projectCards.forEach(card => {
                        const category = card.getAttribute('data-category');

                        if (filter === 'all' || category === filter) {
                            // Reset to default display (grid on desktop, flex on mobile via CSS)
                            card.style.removeProperty('display');

                            // If we are on mobile (check w/ matchMedia or just let CSS handle it), 
                            // we need to make sure we don't force 'grid' if CSS wants 'flex'.
                            // Removing the property lets CSS take over, which has !important on mobile.

                            // Wait, if we set 'none' !important previously, removing it is enough.

                            // Reset animation
                            card.style.animation = 'none';
                            card.offsetHeight; /* trigger reflow */
                            card.style.animation = 'fadeInUp 0.6s ease forwards';
                        } else {
                            card.style.setProperty('display', 'none', 'important');
                        }
                    });
                });
            });
        }
    }
});
