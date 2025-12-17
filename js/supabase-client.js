(function () {
    let supabaseInstance;

    try {
        if (window.supabase && window.supabase.createClient) {
            // Utilisation de la factory globale exposée par le CDN
            const { createClient } = window.supabase;
            supabaseInstance = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
        } else {
            console.error("Le SDK Supabase n'est pas chargé.");
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation de Supabase:", error);
    }

    const SupabaseService = {
        // Récupérer tous les avis triés par date (du plus récent au plus ancien)
        async getReviews() {
            if (!supabaseInstance) {
                console.warn("Supabase non initialisé.");
                return { data: null, error: "Supabase non initialisé" };
            }

            try {
                const { data, error } = await supabaseInstance
                    .from('reviews')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return { data, error };
            } catch (err) {
                console.error("Erreur connexion Supabase:", err);
                return { data: null, error: err };
            }
        },

        // Ajouter un nouvel avis (avec support image)
        async addReview(review, imageFile) {
            if (!supabaseInstance) return { data: null, error: "Supabase non initialisé" };

            let avatarUrl = null;

            // 1. Upload de l'image si présente et valide
            if (imageFile && imageFile.size > 0) {
                const fileExt = imageFile.name.split('.').pop();
                // Nettoyer le nom (enlever espaces et caractères spéciaux)
                const sanitizedName = review.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fileName = `${sanitizedName}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { data: uploadData, error: uploadError } = await supabaseInstance.storage
                    .from('avatars')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    console.error('Erreur upload:', uploadError);
                    // On continue quand même sans l'image ou on retourne une erreur ?
                    // Pour l'instant on log juste l'erreur
                } else {
                    // 2. Récupérer l'URL publique
                    const { data: { publicUrl } } = supabaseInstance.storage
                        .from('avatars')
                        .getPublicUrl(filePath);

                    avatarUrl = publicUrl;
                }
            }

            // 3. Insertion en base
            const { data, error } = await supabaseInstance
                .from('reviews')
                .insert([
                    {
                        name: review.name,
                        role: review.role,
                        message: review.message,
                        rating: review.rating,
                        avatar_url: avatarUrl // Nouvelle colonne
                    }
                ])
                .select();

            return { data, error };
        },

        // S'abonner aux changements en temps réel
        subscribeToReviews(onInsert) {
            if (!supabaseInstance) return;

            supabaseInstance
                .channel('public:reviews')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
                    console.log('Nouvel avis reçu:', payload.new);
                    onInsert(payload.new);
                })
                .subscribe();
        }
    };

    // Rendre le service accessible globalement immédiatement
    window.SupabaseService = SupabaseService;
    console.log('SupabaseService initialisé et exposé globalement.');

    // Déclencher l'événement pour notifier les autres scripts
    window.dispatchEvent(new Event('SupabaseReady'));
    console.log('Événement SupabaseReady déclenché.');
})();
