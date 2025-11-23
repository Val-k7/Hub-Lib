// ========================================
// HUBLIB - Centralized Zod Validation Schemas
// ========================================

import { z } from "zod";
import { DEFAULTS } from "@/constants";

/**
 * Resource validation schema
 */
export const resourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(DEFAULTS.MIN_TITLE_LENGTH, `Le titre doit contenir au moins ${DEFAULTS.MIN_TITLE_LENGTH} caractères`)
    .max(DEFAULTS.MAX_TITLE_LENGTH, `Le titre ne peut pas dépasser ${DEFAULTS.MAX_TITLE_LENGTH} caractères`),
  
  description: z
    .string()
    .trim()
    .min(DEFAULTS.MIN_DESCRIPTION_LENGTH, `La description doit contenir au moins ${DEFAULTS.MIN_DESCRIPTION_LENGTH} caractères`)
    .max(DEFAULTS.MAX_DESCRIPTION_LENGTH, `La description ne peut pas dépasser ${DEFAULTS.MAX_DESCRIPTION_LENGTH} caractères`),
  
  category: z
    .string()
    .min(1, "Veuillez sélectionner une catégorie"),
  
  tags: z
    .array(z.string())
    .min(1, "Ajoutez au moins un tag")
    .max(DEFAULTS.MAX_TAGS, `Maximum ${DEFAULTS.MAX_TAGS} tags`),
  
  github_url: z
    .string()
    .trim()
    .url("URL GitHub invalide")
    .optional()
    .or(z.literal("")),
  
  language: z
    .string()
    .max(50)
    .optional()
    .or(z.literal("")),
  
  readme: z
    .string()
    .max(DEFAULTS.MAX_README_LENGTH, `Le README ne peut pas dépasser ${DEFAULTS.MAX_README_LENGTH} caractères`)
    .optional()
    .or(z.literal("")),
});

export type ResourceFormData = z.infer<typeof resourceSchema>;

/**
 * Category/Tag suggestion validation schema
 */
export const suggestionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères"),
  
  description: z
    .string()
    .trim()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(200, "La description ne peut pas dépasser 200 caractères")
    .optional()
    .or(z.literal("")),
  
  type: z.enum(["category", "tag"]),
});

export type SuggestionFormData = z.infer<typeof suggestionSchema>;

/**
 * Profile update validation schema
 */
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(30, "Le nom d'utilisateur ne peut pas dépasser 30 caractères")
    .regex(/^[a-zA-Z0-9_-]+$/, "Seuls les lettres, chiffres, tirets et underscores sont autorisés")
    .optional()
    .or(z.literal("")),
  
  full_name: z
    .string()
    .trim()
    .max(100, "Le nom complet ne peut pas dépasser 100 caractères")
    .optional()
    .or(z.literal("")),
  
  bio: z
    .string()
    .trim()
    .max(500, "La bio ne peut pas dépasser 500 caractères")
    .optional()
    .or(z.literal("")),
  
  github_username: z
    .string()
    .trim()
    .max(39, "Le nom d'utilisateur GitHub ne peut pas dépasser 39 caractères")
    .regex(/^[a-zA-Z0-9-]+$/, "Nom d'utilisateur GitHub invalide")
    .optional()
    .or(z.literal("")),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Search/filter validation schema
 */
export const searchSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type SearchFormData = z.infer<typeof searchSchema>;
