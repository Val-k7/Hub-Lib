import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Globe, Lock, Users, User, FileText, Link as LinkIcon, Github, Star, Calendar, UserCircle, FileCode, Scale } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { CATEGORIES } from "@/constants";
import { useMemo } from "react";

interface FilterPanelProps {
  selectedCategories: string[];
  selectedTags: string[];
  selectedVisibility: string[];
  selectedResourceTypes: string[];
  minRating: number;
  authorFilter?: string;
  licenseFilter?: string;
  languageFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  onCategoryToggle: (category: string) => void;
  onTagToggle: (tag: string) => void;
  onVisibilityToggle: (visibility: string) => void;
  onResourceTypeToggle: (type: string) => void;
  onMinRatingChange: (rating: number) => void;
  onAuthorChange?: (author: string) => void;
  onLicenseChange?: (license: string) => void;
  onLanguageChange?: (language: string) => void;
  onDateFromChange?: (date: string) => void;
  onDateToChange?: (date: string) => void;
}

// Catégories par défaut (utilisées comme fallback)
const defaultCategories = CATEGORIES;

// Tags par défaut (utilisés comme fallback)
const defaultTags = [
  "pdf", "tutorial", "template", "design", "video", "tools",
  "markdown", "presentation", "guide", "dataset", "reference", "image",
  "formation", "documentation", "checklist"
];

const resourceTypeOptions = [
  { value: "file_upload", label: "Fichier uploadé", icon: FileText },
  { value: "external_link", label: "Lien externe", icon: LinkIcon },
  { value: "github_repo", label: "Repository GitHub", icon: Github },
];

const visibilityOptions = [
  { value: "public", label: "Public", icon: Globe },
  { value: "private", label: "Privé", icon: Lock },
  { value: "shared_users", label: "Partagé (utilisateurs)", icon: User },
  { value: "shared_groups", label: "Partagé (groupes)", icon: Users },
];

const commonLicenses = [
  "MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "ISC", "Unlicense", "CC0-1.0"
];

const commonLanguages = [
  "TypeScript", "JavaScript", "Python", "Java", "C++", "C#", "Go", "Rust",
  "PHP", "Ruby", "Swift", "Kotlin", "Dart", "HTML", "CSS", "SQL"
];

export const FilterPanel = ({
  selectedCategories,
  selectedTags,
  selectedVisibility,
  selectedResourceTypes,
  minRating,
  authorFilter = "",
  licenseFilter = "",
  languageFilter = "",
  dateFrom = "",
  dateTo = "",
  onCategoryToggle,
  onTagToggle,
  onVisibilityToggle,
  onResourceTypeToggle,
  onMinRatingChange,
  onAuthorChange,
  onLicenseChange,
  onLanguageChange,
  onDateFromChange,
  onDateToChange,
}: FilterPanelProps) => {
  // Récupérer UNIQUEMENT les suggestions approuvées pour les catégories
  const { data: approvedCategories } = useQuery({
    queryKey: ["filter-categories-approved"],
    queryFn: async () => {
      const { data: approvedSuggestions, error: suggestionError } = await localClient
        .from("category_tag_suggestions")
        .select("name")
        .eq("type", "category")
        .eq("status", "approved")
        .eq("action", "add")
        .order("votes_count", { ascending: false })
        .execute();

      if (suggestionError) throw suggestionError;

      return (approvedSuggestions || []).map((suggestion: any) => suggestion.name).filter(Boolean).sort();
    },
  });

  // Récupérer UNIQUEMENT les suggestions approuvées pour les tags
  const { data: approvedTags } = useQuery({
    queryKey: ["filter-tags-approved"],
    queryFn: async () => {
      const { data: approvedSuggestions, error: suggestionError } = await localClient
        .from("category_tag_suggestions")
        .select("name")
        .eq("type", "tag")
        .eq("status", "approved")
        .eq("action", "add")
        .order("votes_count", { ascending: false })
        .execute();

      if (suggestionError) throw suggestionError;

      return (approvedSuggestions || []).map((suggestion: any) => suggestion.name.toLowerCase()).filter(Boolean).sort();
    },
  });

  // Récupérer UNIQUEMENT les suggestions approuvées pour les types de ressources
  const { data: approvedResourceTypes } = useQuery({
    queryKey: ["filter-resource-types-approved"],
    queryFn: async () => {
      const { data: approvedSuggestions, error: suggestionError } = await localClient
        .from("category_tag_suggestions")
        .select("name")
        .eq("type", "resource_type")
        .eq("status", "approved")
        .eq("action", "add")
        .order("votes_count", { ascending: false })
        .execute();

      if (suggestionError) throw suggestionError;

      return (approvedSuggestions || []).map((suggestion: any) => suggestion.name).filter(Boolean).sort();
    },
  });

  // Utiliser UNIQUEMENT les suggestions approuvées pour les catégories
  const categories = approvedCategories || [];

  // Utiliser UNIQUEMENT les suggestions approuvées pour les tags
  const popularTags = approvedTags || [];

  // Utiliser UNIQUEMENT les suggestions approuvées pour les types de ressources
  const allResourceTypes = approvedResourceTypes || [];

  return (
    <Card className="p-6 sticky top-24 border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-6">
          {/* Categories with improved styling */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                Catégories
              </h3>
            </div>
            <div className="space-y-1 mb-3">
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    onClick={() => onCategoryToggle(category)}
                    className={`group w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <span>{category}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 animate-scale-in" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Resource Type Filter */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Type de Ressource
            </h3>
            <div className="space-y-1 mb-3">
              {allResourceTypes.map((type) => {
                const option = resourceTypeOptions.find((opt) => opt.value === type);
                const isSelected = selectedResourceTypes.includes(type);
                const Icon = option?.icon || FileCode;
                
                return (
                  <button
                    key={type}
                    onClick={() => onResourceTypeToggle(type)}
                    className={`group w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 capitalize">
                      {option?.label || type.replace("_", " ")}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 animate-scale-in" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Rating Filter */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Note Minimale
            </h3>
            <div className="space-y-4 px-2">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= minRating
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {minRating === 0 ? "Toutes" : `≥ ${minRating} ★`}
                </Badge>
              </div>
              <Slider
                value={[minRating]}
                onValueChange={(values) => onMinRatingChange(values[0])}
                min={0}
                max={5}
                step={0.5}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Aucune note</span>
                <span>5 étoiles</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Visibility Filter */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Visibilité
            </h3>
            <div className="space-y-1">
              {visibilityOptions.map((option) => {
                const isSelected = selectedVisibility.includes(option.value);
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => onVisibilityToggle(option.value)}
                    className={`group w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{option.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 animate-scale-in" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Tags with improved interaction */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Tags Populaires
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {popularTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-all hover:shadow-sm"
                  onClick={() => onTagToggle(tag)}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Author Filter */}
          {onAuthorChange && (
            <div>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Auteur
              </h3>
              <Input
                placeholder="Rechercher par auteur..."
                value={authorFilter}
                onChange={(e) => onAuthorChange(e.target.value)}
                className="h-9"
              />
            </div>
          )}

          <Separator />

          {/* Language Filter */}
          {onLanguageChange && (
            <div>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Langage
              </h3>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {commonLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => onLanguageChange?.(languageFilter === lang ? "" : lang)}
                    className={`group w-full text-left px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                      languageFilter === lang
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <span>{lang}</span>
                    {languageFilter === lang && (
                      <Check className="h-4 w-4 animate-scale-in" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* License Filter */}
          {onLicenseChange && (
            <div>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Licence
              </h3>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {commonLicenses.map((license) => (
                  <button
                    key={license}
                    onClick={() => onLicenseChange?.(licenseFilter === license ? "" : license)}
                    className={`group w-full text-left px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                      licenseFilter === license
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <span>{license}</span>
                    {licenseFilter === license && (
                      <Check className="h-4 w-4 animate-scale-in" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Date Range Filter */}
          {onDateFromChange && onDateToChange && (
            <div>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date de création
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">Du</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onDateFromChange(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Au</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onDateToChange(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Filter count */}
          {(selectedCategories.length > 0 || selectedTags.length > 0 || selectedVisibility.length > 0 || selectedResourceTypes.length > 0 || minRating > 0 || authorFilter || licenseFilter || languageFilter || dateFrom || dateTo) && (
            <div className="pt-4 border-t border-border/50">
              <div className="text-xs text-muted-foreground text-center">
                {selectedCategories.length + selectedTags.length + selectedVisibility.length + selectedResourceTypes.length + (minRating > 0 ? 1 : 0) + (authorFilter ? 1 : 0) + (licenseFilter ? 1 : 0) + (languageFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)} filtre{(selectedCategories.length + selectedTags.length + selectedVisibility.length + selectedResourceTypes.length + (minRating > 0 ? 1 : 0) + (authorFilter ? 1 : 0) + (licenseFilter ? 1 : 0) + (languageFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)) > 1 ? 's' : ''} actif{(selectedCategories.length + selectedTags.length + selectedVisibility.length + selectedResourceTypes.length + (minRating > 0 ? 1 : 0) + (authorFilter ? 1 : 0) + (licenseFilter ? 1 : 0) + (languageFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)) > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
