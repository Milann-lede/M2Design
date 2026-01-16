-- ============================================
-- CONFIGURATION SUPABASE POUR DASHBOARD MODERNWEB
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- 1. TABLE PROJECTS
-- Stocke tous les projets affichés sur le site
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Informations principales
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    client_type VARCHAR(50) CHECK (client_type IN ('particulier', 'professionnel')),
    
    -- Descriptions
    short_description TEXT,
    full_description TEXT,
    
    -- Métadonnées projet
    technologies TEXT[], -- Array de technologies utilisées
    project_date DATE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'published')),
    
    -- Médias
    thumbnail_url TEXT,
    images TEXT[], -- Array d'URLs d'images
    external_link TEXT,
    
    -- Affichage
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    
    -- Catégorie pour filtrage (nature, tech, gaming, construction, etc.)
    category VARCHAR(100)
);

-- 2. TABLE CLIENT_BRIEFS (PDF clients)
-- Métadonnées des briefs clients uploadés
CREATE TABLE IF NOT EXISTS client_briefs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Informations client
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    
    -- Informations projet
    project_type VARCHAR(100),
    brief_notes TEXT,
    
    -- Fichier PDF
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    
    -- Gestion
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'archived')),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 3. TABLE ADMIN_SETTINGS (paramètres globaux)
CREATE TABLE IF NOT EXISTS admin_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. INDEX pour performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_briefs_status ON client_briefs(status);
CREATE INDEX IF NOT EXISTS idx_briefs_created ON client_briefs(created_at DESC);

-- 5. FONCTION pour mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGERS
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. ROW LEVEL SECURITY (RLS)
-- Activer RLS sur les tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Politique pour projects : lecture publique, écriture authentifiée
CREATE POLICY "Projects public read" ON projects
    FOR SELECT USING (status = 'published');

CREATE POLICY "Projects admin full access" ON projects
    FOR ALL USING (auth.role() = 'authenticated');

-- Politique pour client_briefs : accès authentifié uniquement
CREATE POLICY "Briefs admin only" ON client_briefs
    FOR ALL USING (auth.role() = 'authenticated');

-- Politique pour admin_settings : accès authentifié uniquement
CREATE POLICY "Settings admin only" ON admin_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- 8. STORAGE BUCKETS (à créer via l'interface Supabase Storage)
-- Bucket 'project-images' : pour les images des projets
-- Bucket 'client-briefs' : pour les PDF des clients (privé)

-- Note: Les buckets doivent être créés manuellement dans l'interface Supabase :
-- 1. Aller dans Storage
-- 2. Créer bucket 'project-images' (public)
-- 3. Créer bucket 'client-briefs' (private)

-- ============================================
-- FIN DU SETUP
-- ============================================
