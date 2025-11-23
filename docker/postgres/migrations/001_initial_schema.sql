-- Migration initiale : Structure complète de la base de données Hub-Lib
-- Cette migration crée toutes les tables nécessaires

-- Extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des ressources
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(255),
    tags TEXT[],
    resource_type VARCHAR(50) NOT NULL DEFAULT 'external_link',
    visibility VARCHAR(50) NOT NULL DEFAULT 'public',
    github_url TEXT,
    external_url TEXT,
    file_path TEXT,
    file_url TEXT,
    file_size VARCHAR(50),
    language VARCHAR(100),
    license VARCHAR(100),
    readme TEXT,
    average_rating DECIMAL(3,2) DEFAULT 0,
    ratings_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des suggestions (catégories, tags, types, filtres)
CREATE TABLE IF NOT EXISTS category_tag_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('category', 'tag', 'resource_type', 'filter')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    action VARCHAR(50) NOT NULL DEFAULT 'add' CHECK (action IN ('add')),
    votes_count INTEGER DEFAULT 0,
    suggested_by UUID REFERENCES profiles(user_id),
    reviewed_by UUID REFERENCES profiles(user_id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Table des votes sur les suggestions
CREATE TABLE IF NOT EXISTS suggestion_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id UUID NOT NULL REFERENCES category_tag_suggestions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(user_id),
    vote_type VARCHAR(50) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(suggestion_id, user_id)
);

-- Table des rôles utilisateurs
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id),
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
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

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_visibility ON resources(visibility);
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at);
CREATE INDEX IF NOT EXISTS idx_category_tag_suggestions_type ON category_tag_suggestions(type);
CREATE INDEX IF NOT EXISTS idx_category_tag_suggestions_status ON category_tag_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_category_tag_suggestions_votes_count ON category_tag_suggestions(votes_count);
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_suggestion_id ON suggestion_votes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_user_id ON suggestion_votes(user_id);

