import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, TrendingUp } from "lucide-react";
import { templateService, type ResourceTemplate } from "@/services/templateService";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface TemplateSelectorProps {
  onSelectTemplate: (template: ResourceTemplate) => void;
  onCancel?: () => void;
}

export const TemplateSelector = ({ onSelectTemplate, onCancel }: TemplateSelectorProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ResourceTemplate[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<ResourceTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<ResourceTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const [allTemplates, popular] = await Promise.all([
        templateService.getPublicTemplates(),
        templateService.getPopularTemplates(5),
      ]);
      setTemplates(allTemplates);
      setPopularTemplates(popular);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const results = await templateService.searchTemplates(searchQuery);
      setSearchResults(results);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche",
        variant: "destructive",
      });
    }
  };

  const displayTemplates = searchQuery.trim() ? searchResults : templates;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Chargement des templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Templates de Ressources</h2>
          <p className="text-muted-foreground">
            Choisissez un template pour créer rapidement une nouvelle ressource
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {popularTemplates.length > 0 && !searchQuery.trim() && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Templates Populaires</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => onSelectTemplate(template)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">
            {searchQuery.trim() ? "Résultats de recherche" : "Tous les templates"}
          </h3>
        </div>

        {displayTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery.trim()
                ? "Aucun template trouvé"
                : "Aucun template disponible"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => onSelectTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      {onCancel && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
};

interface TemplateCardProps {
  template: ResourceTemplate;
  onSelect: () => void;
}

const TemplateCard = ({ template, onSelect }: TemplateCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onSelect}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1">{template.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>
        {template.language && (
          <div className="text-sm text-muted-foreground">
            Langage: {template.language}
          </div>
        )}
        {template.usageCount > 0 && (
          <div className="text-xs text-muted-foreground">
            Utilisé {template.usageCount} fois
          </div>
        )}
        <Button className="w-full mt-2" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
          Utiliser ce template
        </Button>
      </CardContent>
    </Card>
  );
};


