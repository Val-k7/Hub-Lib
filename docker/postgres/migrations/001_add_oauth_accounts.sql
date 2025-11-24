-- Migration pour ajouter la table oauth_accounts
-- Date: 2024

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

-- Trigger pour updated_at
CREATE TRIGGER update_oauth_accounts_updated_at BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

