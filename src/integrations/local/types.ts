// Types pour le client local (compatible avec les types Supabase)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      category_tag_suggestions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          suggested_by: string | null
          type: Database["public"]["Enums"]["suggestion_type"]
          updated_at: string
          votes_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggested_by?: string | null
          type?: Database["public"]["Enums"]["suggestion_type"]
          updated_at?: string
          votes_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggested_by?: string | null
          type?: Database["public"]["Enums"]["suggestion_type"]
          updated_at?: string
          votes_count?: number
        }
        Relationships: []
      }
      group_members: {
        Row: {
          added_at: string
          group_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          is_read: boolean
          message: string
          resource_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          resource_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          resource_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          github_username: string | null
          id: string
          preferred_layout: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          github_username?: string | null
          id: string
          preferred_layout?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          github_username?: string | null
          id?: string
          preferred_layout?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      resource_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          resource_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          resource_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          resource_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resource_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          resource_id: string
          shared_with_group_id: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: string
          resource_id: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          resource_id?: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          average_rating: number | null
          category: string
          created_at: string
          description: string
          downloads_count: number | null
          external_url: string | null
          file_path: string | null
          file_size: string | null
          file_url: string | null
          github_url: string | null
          id: string
          language: string | null
          license: string | null
          ratings_count: number | null
          readme: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
          visibility: Database["public"]["Enums"]["resource_visibility"]
        }
        Insert: {
          average_rating?: number | null
          category: string
          created_at?: string
          description: string
          downloads_count?: number | null
          external_url?: string | null
          file_path?: string | null
          file_size?: string | null
          file_url?: string | null
          github_url?: string | null
          id?: string
          language?: string | null
          license?: string | null
          ratings_count?: number | null
          readme?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
          visibility?: Database["public"]["Enums"]["resource_visibility"]
        }
        Update: {
          average_rating?: number | null
          category?: string
          created_at?: string
          description?: string
          downloads_count?: number | null
          external_url?: string | null
          file_path?: string | null
          file_size?: string | null
          file_url?: string | null
          github_url?: string | null
          id?: string
          language?: string | null
          license?: string | null
          ratings_count?: number | null
          readme?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
          visibility?: Database["public"]["Enums"]["resource_visibility"]
        }
        Relationships: []
      }
      saved_resources: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestion_votes: {
        Row: {
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
          vote_type?: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
          vote_type?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_resource_downloads: {
        Args: { resource_id: string }
        Returns: undefined
      }
      increment_resource_views: {
        Args: { resource_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      resource_type: "file_upload" | "external_link" | "github_repo"
      resource_visibility:
        | "public"
        | "private"
        | "shared_users"
        | "shared_groups"
      suggestion_status: "pending" | "approved" | "rejected"
      suggestion_type: "category" | "tag" | "resource_type" | "filter"
      vote_type: "upvote" | "downvote"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      resource_type: ["file_upload", "external_link", "github_repo"],
      resource_visibility: [
        "public",
        "private",
        "shared_users",
        "shared_groups",
      ],
      suggestion_status: ["pending", "approved", "rejected"],
      suggestion_type: ["category", "tag", "resource_type", "filter"],
      vote_type: ["upvote", "downvote"],
    },
  },
} as const

