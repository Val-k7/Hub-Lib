-- =============================================================================
-- Schéma PostgreSQL complet pour Hub-Lib
-- Version: 2.0.0
-- Date: 2024
-- Description: Migration complète de localStorage vers PostgreSQL
-- =============================================================================

-- Extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour la recherche full-text
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- TYPES ENUMERATIONS
-- =============================================================================

-- Types de rôles utilisateurs
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Types de ressources
DO $$ BEGIN
    CREATE TYPE resource_type AS ENUM ('file_upload', 'external_link', 'github_repo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Visibilité des ressources
DO $$ BEGIN
    CREATE TYPE resource_visibility AS ENUM ('public', 'private', 'shared_users', 'shared_groups');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Statut des suggestions
DO $$ BEGIN
    CREATE TYPE suggestion_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Type de suggestion
DO $$ BEGIN
    CREATE TYPE suggestion_type AS ENUM ('category', 'tag', 'resource_type', 'filter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Type de vote
DO $$ BEGIN
    CREATE TYPE vote_type AS ENUM ('upvote', 'downvote');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Type de permission
DO $$ BEGIN
    CREATE TYPE permission_type AS ENUM ('read', 'write');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Type de rôle dans un groupe
DO $$ BEGIN
    CREATE TYPE group_role AS ENUM ('admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- TABLES PRINCIPALES
-- =============================================================================

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    github_username VARCHAR(255),
    preferred_layout VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table d'authentification pour stocker les mots de passe hashés
CREATE TABLE IF NOT EXISTS auth_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour auth_profiles
CREATE INDEX IF NOT EXISTS idx_auth_profiles_user_id ON auth_profiles(user_id);

-- Table des ressources
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(255),
    tags TEXT[],
    resource_type resource_type NOT NULL DEFAULT 'external_link',
    visibility resource_visibility NOT NULL DEFAULT 'public',
    github_url TEXT,
    external_url TEXT,
    file_path TEXT,
    file_url TEXT,
    file_size VARCHAR(50),
    language VARCHAR(100),
    license VARCHAR(100),
    readme TEXT,
    average_rating DECIMAL(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
    ratings_count INTEGER DEFAULT 0 CHECK (ratings_count >= 0),
    downloads_count INTEGER DEFAULT 0 CHECK (downloads_count >= 0),
    views_count INTEGER DEFAULT 0 CHECK (views_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des ressources sauvegardées (favoris)
CREATE TABLE IF NOT EXISTS saved_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, resource_id)
);

-- Table des notes/ratings des ressources
CREATE TABLE IF NOT EXISTS resource_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, resource_id)
);

-- Table des commentaires sur les ressources
CREATE TABLE IF NOT EXISTS resource_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    parent_id UUID REFERENCES resource_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des groupes d'utilisateurs
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des partages de ressources (après groups pour la référence)
CREATE TABLE IF NOT EXISTS resource_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    shared_with_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    permission permission_type NOT NULL DEFAULT 'read',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
    )
);

-- Table des membres de groupes
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    role group_role NOT NULL DEFAULT 'member',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des suggestions (catégories, tags, types, filtres)
CREATE TABLE IF NOT EXISTS category_tag_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type suggestion_type NOT NULL,
    status suggestion_status NOT NULL DEFAULT 'pending',
    action VARCHAR(50) NOT NULL DEFAULT 'add' CHECK (action IN ('add')),
    votes_count INTEGER DEFAULT 0,
    suggested_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Table des votes sur les suggestions
CREATE TABLE IF NOT EXISTS suggestion_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id UUID NOT NULL REFERENCES category_tag_suggestions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    vote_type vote_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(suggestion_id, user_id)
);

-- Table des rôles utilisateurs
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Table de configuration admin
CREATE TABLE IF NOT EXISTS admin_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des templates de ressources
CREATE TABLE IF NOT EXISTS resource_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(255) NOT NULL,
    tags TEXT[] NOT NULL,
    language VARCHAR(100),
    readme TEXT,
    icon VARCHAR(255),
    preview TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des collections de ressources
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    cover_image_url TEXT,
    resources_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des relations collection-ressource
CREATE TABLE IF NOT EXISTS collection_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_index INTEGER DEFAULT 0,
    UNIQUE(collection_id, resource_id)
);

-- Table des versions de ressources
CREATE TABLE IF NOT EXISTS resource_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(255),
    tags TEXT[],
    github_url TEXT,
    external_url TEXT,
    language VARCHAR(100),
    readme TEXT,
    file_path TEXT,
    file_url TEXT,
    file_size VARCHAR(50),
    created_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource_id, version_number)
);

-- Table de hiérarchie des catégories
CREATE TABLE IF NOT EXISTS category_hierarchy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES category_hierarchy(id) ON DELETE CASCADE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des filtres de catégories
CREATE TABLE IF NOT EXISTS category_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES category_hierarchy(id) ON DELETE CASCADE,
    filter_key VARCHAR(255) NOT NULL,
    filter_type VARCHAR(50) NOT NULL CHECK (filter_type IN ('text', 'select', 'multiselect', 'range', 'date')),
    filter_label VARCHAR(255) NOT NULL,
    filter_options TEXT[],
    is_required BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des événements analytics pour stockage long terme
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des tokens API pour authentification externe
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEX POUR PERFORMANCE
-- =============================================================================

-- Index pour profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Index pour resources
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_visibility ON resources(visibility);
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_resources_title_search ON resources USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_description_search ON resources USING GIN(description gin_trgm_ops);

-- Index pour saved_resources
CREATE INDEX IF NOT EXISTS idx_saved_resources_user_id ON saved_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_resources_resource_id ON saved_resources(resource_id);

-- Index pour resource_ratings
CREATE INDEX IF NOT EXISTS idx_resource_ratings_user_id ON resource_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_ratings_resource_id ON resource_ratings(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_ratings_rating ON resource_ratings(rating);

-- Index pour resource_shares
CREATE INDEX IF NOT EXISTS idx_resource_shares_resource_id ON resource_shares(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_shares_user_id ON resource_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_resource_shares_group_id ON resource_shares(shared_with_group_id);

-- Index pour resource_comments
CREATE INDEX IF NOT EXISTS idx_resource_comments_resource_id ON resource_comments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_comments_user_id ON resource_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_comments_parent_id ON resource_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_resource_comments_created_at ON resource_comments(created_at);

-- Index pour groups
CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);

-- Index pour group_members
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Index pour notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Index pour category_tag_suggestions
CREATE INDEX IF NOT EXISTS idx_category_tag_suggestions_type ON category_tag_suggestions(type);
CREATE INDEX IF NOT EXISTS idx_category_tag_suggestions_status ON category_tag_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_category_tag_suggestions_votes_count ON category_tag_suggestions(votes_count);
CREATE INDEX IF NOT EXISTS idx_category_tag_suggestions_suggested_by ON category_tag_suggestions(suggested_by);

-- Index pour suggestion_votes
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_suggestion_id ON suggestion_votes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_user_id ON suggestion_votes(user_id);

-- Index pour collections
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_is_public ON collections(is_public);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at);

-- Index pour collection_resources
CREATE INDEX IF NOT EXISTS idx_collection_resources_collection_id ON collection_resources(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_resources_resource_id ON collection_resources(resource_id);

-- Index pour resource_versions
CREATE INDEX IF NOT EXISTS idx_resource_versions_resource_id ON resource_versions(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_versions_version_number ON resource_versions(resource_id, version_number);
CREATE INDEX IF NOT EXISTS idx_resource_versions_created_by ON resource_versions(created_by);

-- Index pour category_hierarchy
CREATE INDEX IF NOT EXISTS idx_category_hierarchy_parent_id ON category_hierarchy(parent_id);
CREATE INDEX IF NOT EXISTS idx_category_hierarchy_is_active ON category_hierarchy(is_active);

-- Index pour category_filters
CREATE INDEX IF NOT EXISTS idx_category_filters_category_id ON category_filters(category_id);

-- Index pour analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_resource_id ON analytics_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created ON analytics_events(event, created_at);

-- Index pour api_tokens
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);

-- Table des comptes OAuth liés
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('github', 'google')),
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token TEXT NOT NULL, -- Chiffré
    refresh_token TEXT, -- Chiffré (optionnel selon le provider)
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT[], -- Scopes accordés
    metadata JSONB, -- Infos supplémentaires (username, avatar, etc.)
    is_primary BOOLEAN DEFAULT FALSE, -- Compte principal pour ce provider
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider, provider_user_id)
);

-- Index pour oauth_accounts
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider_user_id ON oauth_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_is_primary ON oauth_accounts(user_id, provider, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_api_tokens_expires_at ON api_tokens(expires_at);

-- =============================================================================
-- TRIGGERS POUR UPDATED_AT AUTOMATIQUE
-- =============================================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_profiles_updated_at BEFORE UPDATE ON auth_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_ratings_updated_at BEFORE UPDATE ON resource_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_comments_updated_at BEFORE UPDATE ON resource_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_tag_suggestions_updated_at BEFORE UPDATE ON category_tag_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_configs_updated_at BEFORE UPDATE ON admin_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_templates_updated_at BEFORE UPDATE ON resource_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_hierarchy_updated_at BEFORE UPDATE ON category_hierarchy
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_filters_updated_at BEFORE UPDATE ON category_filters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_accounts_updated_at BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGERS POUR METTRE À JOUR LES COMPTEURS
-- =============================================================================

-- Fonction pour mettre à jour resources_count dans collections
CREATE OR REPLACE FUNCTION update_collection_resources_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE collections SET resources_count = resources_count + 1 WHERE id = NEW.collection_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collections SET resources_count = GREATEST(resources_count - 1, 0) WHERE id = OLD.collection_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collection_resources_count_trigger
    AFTER INSERT OR DELETE ON collection_resources
    FOR EACH ROW EXECUTE FUNCTION update_collection_resources_count();

-- Fonction pour mettre à jour average_rating et ratings_count dans resources
CREATE OR REPLACE FUNCTION update_resource_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_count INTEGER;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT AVG(rating)::DECIMAL(3,2), COUNT(*) INTO avg_rating, total_count
        FROM resource_ratings
        WHERE resource_id = NEW.resource_id;
        
        UPDATE resources
        SET average_rating = COALESCE(avg_rating, 0),
            ratings_count = total_count
        WHERE id = NEW.resource_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT AVG(rating)::DECIMAL(3,2), COUNT(*) INTO avg_rating, total_count
        FROM resource_ratings
        WHERE resource_id = OLD.resource_id;
        
        UPDATE resources
        SET average_rating = COALESCE(avg_rating, 0),
            ratings_count = total_count
        WHERE id = OLD.resource_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_resource_rating_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON resource_ratings
    FOR EACH ROW EXECUTE FUNCTION update_resource_rating_stats();

-- Fonction pour mettre à jour votes_count dans category_tag_suggestions
CREATE OR REPLACE FUNCTION update_suggestion_votes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE category_tag_suggestions
        SET votes_count = (
            SELECT COUNT(*) 
            FROM suggestion_votes 
            WHERE suggestion_id = NEW.suggestion_id
        )
        WHERE id = NEW.suggestion_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE category_tag_suggestions
        SET votes_count = (
            SELECT COUNT(*) 
            FROM suggestion_votes 
            WHERE suggestion_id = OLD.suggestion_id
        )
        WHERE id = OLD.suggestion_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suggestion_votes_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON suggestion_votes
    FOR EACH ROW EXECUTE FUNCTION update_suggestion_votes_count();

-- =============================================================================
-- FONCTIONS POSTGRESQL
-- =============================================================================

-- Fonction pour incrémenter les vues d'une ressource
CREATE OR REPLACE FUNCTION increment_resource_views(resource_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE resources
    SET views_count = views_count + 1
    WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour incrémenter les téléchargements d'une ressource
CREATE OR REPLACE FUNCTION increment_resource_downloads(resource_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE resources
    SET downloads_count = downloads_count + 1
    WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un utilisateur a un rôle
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = _user_id AND role = _role
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DONNÉES INITIALES
-- =============================================================================

-- Insérer les données initiales (catégories, tags, types approuvés)
INSERT INTO category_tag_suggestions (name, description, type, status, votes_count, action) VALUES
-- Catégories
('Développement', 'Ressources liées au développement logiciel et programmation', 'category', 'approved', 10, 'add'),
('Design', 'Ressources pour le design UI/UX, graphisme, illustration', 'category', 'approved', 10, 'add'),
('Documentation', 'Documentation technique, guides, tutoriels', 'category', 'approved', 10, 'add'),
('Outils', 'Outils et applications utiles pour le développement', 'category', 'approved', 10, 'add'),
('Templates', 'Templates et modèles réutilisables', 'category', 'approved', 10, 'add'),
('Médias', 'Images, vidéos, audio et autres ressources multimédias', 'category', 'approved', 10, 'add'),
('Données', 'Datasets, bases de données, APIs publiques', 'category', 'approved', 10, 'add'),
('Learning', 'Ressources d''apprentissage, cours, formations', 'category', 'approved', 10, 'add'),
-- Tags
('react', 'Ressources liées à React', 'tag', 'approved', 8, 'add'),
('typescript', 'Ressources TypeScript', 'tag', 'approved', 8, 'add'),
('javascript', 'Ressources JavaScript', 'tag', 'approved', 8, 'add'),
('python', 'Ressources Python', 'tag', 'approved', 8, 'add'),
('api', 'APIs et endpoints', 'tag', 'approved', 8, 'add'),
('database', 'Bases de données', 'tag', 'approved', 8, 'add'),
('frontend', 'Développement frontend', 'tag', 'approved', 8, 'add'),
('backend', 'Développement backend', 'tag', 'approved', 8, 'add'),
('mobile', 'Développement mobile', 'tag', 'approved', 8, 'add'),
('devops', 'DevOps et infrastructure', 'tag', 'approved', 8, 'add'),
('ui', 'Interface utilisateur', 'tag', 'approved', 8, 'add'),
('ux', 'Expérience utilisateur', 'tag', 'approved', 8, 'add'),
('open-source', 'Projets open source', 'tag', 'approved', 8, 'add'),
('tutorial', 'Tutoriels et guides', 'tag', 'approved', 8, 'add'),
('library', 'Bibliothèques et frameworks', 'tag', 'approved', 8, 'add'),
-- Types de ressources
('github_repo', 'Dépôt GitHub', 'resource_type', 'approved', 5, 'add'),
('external_link', 'Lien externe', 'resource_type', 'approved', 5, 'add'),
('file_upload', 'Fichier uploadé', 'resource_type', 'approved', 5, 'add'),
-- Filtres
('Popularité', 'Filtrer par popularité (vues, téléchargements)', 'filter', 'approved', 7, 'add'),
('Date', 'Filtrer par date de création', 'filter', 'approved', 7, 'add'),
('Note', 'Filtrer par note moyenne', 'filter', 'approved', 7, 'add'),
('Langue', 'Filtrer par langage de programmation', 'filter', 'approved', 7, 'add'),
('Licence', 'Filtrer par type de licence', 'filter', 'approved', 7, 'add'),
('Visibilité', 'Filtrer par visibilité (public/privé)', 'filter', 'approved', 7, 'add')
ON CONFLICT (name, type) DO NOTHING;

-- Configuration admin par défaut
INSERT INTO admin_configs (key, value, description) VALUES
('auto_approval_enabled', 'true', 'Activer l''approbation automatique basée sur les votes'),
('consider_downvotes', 'true', 'Prendre en compte les downvotes dans le calcul du score'),
('auto_approval_vote_threshold_category', '5', 'Score net requis pour l''approbation automatique d''une catégorie'),
('auto_approval_vote_threshold_tag', '5', 'Score net requis pour l''approbation automatique d''un tag'),
('auto_approval_vote_threshold_resource_type', '5', 'Score net requis pour l''approbation automatique d''un type de ressource'),
('auto_approval_vote_threshold_filter', '5', 'Score net requis pour l''approbation automatique d''un filtre'),
('auto_rejection_downvote_threshold_category', '3', 'Nombre de downvotes requis pour le rejet automatique d''une catégorie'),
('auto_rejection_downvote_threshold_tag', '3', 'Nombre de downvotes requis pour le rejet automatique d''un tag'),
('auto_rejection_downvote_threshold_resource_type', '3', 'Nombre de downvotes requis pour le rejet automatique d''un type de ressource'),
('auto_rejection_downvote_threshold_filter', '3', 'Nombre de downvotes requis pour le rejet automatique d''un filtre')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- COMMENTAIRES SUR LES TABLES
-- =============================================================================

COMMENT ON TABLE profiles IS 'Profils utilisateurs de l''application';
COMMENT ON TABLE resources IS 'Ressources partagées par les utilisateurs';
COMMENT ON TABLE saved_resources IS 'Ressources sauvegardées (favoris) par les utilisateurs';
COMMENT ON TABLE resource_ratings IS 'Notes/ratings données aux ressources par les utilisateurs';
COMMENT ON TABLE resource_shares IS 'Partages de ressources avec utilisateurs ou groupes';
COMMENT ON TABLE resource_comments IS 'Commentaires sur les ressources avec support des réponses';
COMMENT ON TABLE groups IS 'Groupes d''utilisateurs pour le partage';
COMMENT ON TABLE group_members IS 'Membres des groupes avec leurs rôles';
COMMENT ON TABLE notifications IS 'Notifications pour les utilisateurs';
COMMENT ON TABLE category_tag_suggestions IS 'Suggestions de catégories, tags, types et filtres';
COMMENT ON TABLE suggestion_votes IS 'Votes sur les suggestions';
COMMENT ON TABLE user_roles IS 'Rôles des utilisateurs (admin/user)';
COMMENT ON TABLE admin_configs IS 'Configuration administrateur';
COMMENT ON TABLE resource_templates IS 'Templates de ressources réutilisables';
COMMENT ON TABLE collections IS 'Collections de ressources organisées';
COMMENT ON TABLE collection_resources IS 'Relations entre collections et ressources';
COMMENT ON TABLE resource_versions IS 'Versions historiques des ressources';
COMMENT ON TABLE category_hierarchy IS 'Hiérarchie des catégories';
COMMENT ON TABLE category_filters IS 'Filtres spécifiques aux catégories';

-- =============================================================================
-- FIN DU SCHÉMA
-- =============================================================================
