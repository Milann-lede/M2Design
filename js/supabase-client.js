
// Initialisation de Supabase
// Assurez-vous d'avoir inclus le script SDK Supabase dans votre HTML avant ce fichier
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabase;

try {
    if (typeof supabase !== 'undefined') {
        // Si le client est déjà initialisé globalement (cas rare)
    } else if (window.supabase) {
        // Utilisation de la factory globale exposée par le CDN
        const { createClient } = window.supabase;
        supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
    } else {
        console.error("Le SDK Supabase n'est pas chargé.");
    }
} catch (error) {
    console.error("Erreur lors de l'initialisation de Supabase:", error);
}

const SupabaseService = {
    // Récupérer tous les avis triés par date (du plus récent au plus ancien)
    async getReviews() {
        if (!supabase) return { data: [], error: "Supabase non initialisé" };

        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });

        return { data, error };
    },

    // Ajouter un nouvel avis (avec support image)
    async addReview(review, imageFile) {
        if (!supabase) return { data: null, error: "Supabase non initialisé" };

        let avatarUrl = null;

        // 1. Upload de l'image si présente et valide
        if (imageFile && imageFile.size > 0) {
            const fileExt = imageFile.name.split('.').pop();
            // Nettoyer le nom (enlever espaces et caractères spéciaux)
            const sanitizedName = review.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${sanitizedName}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, imageFile);

            if (uploadError) {
                console.error('Erreur upload:', uploadError);
                // On continue quand même sans l'image ou on retourne une erreur ?
                // Pour l'instant on log juste l'erreur
            } else {
                // 2. Récupérer l'URL publique
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                avatarUrl = publicUrl;
            }
        }

        // 3. Insertion en base
        const { data, error } = await supabase
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
        if (!supabase) return;

        supabase
            .channel('public:reviews')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
                console.log('Nouvel avis reçu:', payload.new);
                onInsert(payload.new);
            })
            .subscribe();
    }
};
