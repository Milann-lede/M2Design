
const SUPABASE_URL = "https://zenclsoqcmmzxhnjusyg.supabase.co";
const SUPABASE_KEY = "sb_publishable_6of-ackLkcaOGs2rxIqcHA_gR9ro9gH";

async function pingSupabase() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=*&limit=1`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });

        if (res.ok) {
            // Ping successful
        } else {
            console.error("Erreur ping:", res.status);
        }
    } catch (err) {
        console.error("Erreur réseau ping:", err.message);
    }
}

pingSupabase();
