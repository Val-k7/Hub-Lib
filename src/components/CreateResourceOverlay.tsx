/**
 * Overlay pour créer une ressource
 * Utilise un Dialog pour afficher le formulaire de création
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import { TemplateSelector } from "@/components/TemplateSelector";
import { ShareResourceDialog } from "@/components/ShareResourceDialog";
import { X, Plus, Sparkles, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { localClient } from "@/integrations/local/client";
import { templateService, type ResourceTemplate } from "@/services/templateService";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useCreateResource } from "@/contexts/CreateResourceContext";
import { logger } from "@/lib/logger";

const categories = [
  "Documents & Fichiers",
  "Liens & Favoris",
  "Médias & Images",
  "Templates & Modèles",
  "Code & Scripts",
  "Formations & Tutoriels",
  "Outils & Utilitaires",
  "Données & Références",
];

const resourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(100, "Le titre ne peut pas dépasser 100 caractères"),
  description: z
    .string()
    .trim()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(500, "La description ne peut pas dépasser 500 caractères"),
  category: z.string().min(1, "Veuillez sélectionner une catégorie"),
  tags: z
    .array(z.string())
    .min(1, "Ajoutez au moins un tag")
    .max(10, "Maximum 10 tags"),
  github_url: z
    .string()
    .trim()
    .url("URL GitHub invalide")
    .optional()
    .or(z.literal("")),
  language: z.string().max(50).optional().or(z.literal("")),
  readme: z.string().max(10000, "Le README ne peut pas dépasser 10000 caractères").optional().or(z.literal("")),
});

export const CreateResourceOverlay = () => {
  const { isOpen, closeCreateResource, initialType } = useCreateResource();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResourceId, setCreatedResourceId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    tags: [] as string[],
    github_url: "",
    external_url: "",
    language: "",
    readme: "",
    visibility: "public" as "public" | "private" | "shared_users" | "shared_groups",
    file: null as UploadedFile | null,
  });

  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Réinitialiser le formulaire quand l'overlay s'ouvre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: "",
        description: "",
        category: "",
        tags: [],
        github_url: "",
        external_url: "",
        language: "",
        readme: "",
        visibility: "public",
        file: null,
      });
      setTagInput("");
      setErrors({});
      setCreatedResourceId(null);
      
      // Gérer le type initial
      if (initialType === "github") {
        toast({
          title: "Import GitHub",
          description: "Remplissez l'URL GitHub pour importer un dépôt",
        });
      } else if (initialType === "upload") {
        toast({
          title: "Upload fichier",
          description: "Sélectionnez un fichier à uploader",
        });
      }
    }
  }, [isOpen, initialType, toast]);

  // Récupérer tous les tags existants
  useEffect(() => {
    if (isOpen && user) {
      const fetchTags = async () => {
        try {
          const { data } = await localClient.from("resources").select("tags");
          if (data) {
            const allTags = data
              .flatMap((r) => r.tags || [])
              .filter((tag, index, self) => self.indexOf(tag) === index);
            setExistingTags(allTags);
          }
        } catch (error) {
          logger.error("Erreur lors de la récupération des tags", undefined, error instanceof Error ? error : new Error(String(error)));
        }
      };
      fetchTags();
    }
  }, [isOpen, user]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput("");
      
      // Suggérer des tags similaires
      const similarTags = existingTags.filter(
        (t) => t.includes(tag) || tag.includes(t)
      );
      setSuggestedTags(similarTags.slice(0, 5));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleTemplateSelect = async (template: ResourceTemplate) => {
    if (!user) return;

    try {
      const resource = await templateService.createResourceFromTemplate(
        template.id,
        user.id
      );

      toast({
        title: "Ressource créée !",
        description: `Ressource créée à partir du template "${template.name}"`,
      });

      setShowTemplateSelector(false);
      closeCreateResource();
      navigate(`/resource/${resource.id}`);
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible de créer la ressource",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer une ressource",
        variant: "destructive",
      });
      return;
    }

    // Validation
    try {
      resourceSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast({
          title: "Erreur de validation",
          description: "Veuillez corriger les erreurs dans le formulaire",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Déterminer le type de ressource
      let resourceType: "file_upload" | "external_link" | "github_repo" = "external_link";
      if (formData.file) {
        resourceType = "file_upload";
      } else if (formData.github_url) {
        resourceType = "github_repo";
      }

      // Préparer les données
      const resourceData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        tags: formData.tags,
        resource_type: resourceType,
        github_url: formData.github_url.trim() || null,
        external_url: formData.external_url.trim() || null,
        language: formData.language.trim() || null,
        readme: formData.readme.trim() || null,
        user_id: user.id,
        visibility: formData.visibility,
      };

      // Si un fichier est uploadé, le stocker
      if (formData.file) {
        const fileKey = `hub-lib-file-${Date.now()}-${formData.file.name}`;
        localStorage.setItem(fileKey, JSON.stringify({
          name: formData.file.name,
          type: formData.file.type,
          size: formData.file.size,
          data: formData.file.data,
        }));

        resourceData.file_path = fileKey;
        resourceData.file_url = `data:${formData.file.type};base64,${formData.file.data}`;
        resourceData.file_size = formData.file.size.toString();
      }

      const { data, error } = await localClient.from("resources").insert(resourceData).select().single();

      if (error) throw error;

      setCreatedResourceId(data.id);
      
      toast({
        title: "Ressource créée !",
        description: "Votre ressource a été publiée avec succès",
      });
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible de créer la ressource",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      closeCreateResource();
      if (createdResourceId) {
        navigate(`/resource/${createdResourceId}`);
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">
                Créer une <span className="text-primary">Ressource</span>
              </DialogTitle>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {createdResourceId ? (
            <div className="text-center space-y-6 py-8">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Ressource créée avec succès !</h2>
              <p className="text-muted-foreground">
                Souhaitez-vous configurer le partage maintenant ?
              </p>
              <div className="flex gap-4 justify-center">
                <ShareResourceDialog 
                  resourceId={createdResourceId}
                  currentVisibility={formData.visibility}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    closeCreateResource();
                    navigate(`/resource/${createdResourceId}`);
                  }}
                >
                  Voir la ressource
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Template selector button */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTemplateSelector(true)}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Utiliser un template
                </Button>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Titre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Ex: Collection de React Hooks utiles"
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Décrivez votre ressource en quelques phrases..."
                  rows={4}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">
                  Catégorie <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger
                    className={errors.category ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category}</p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>
                  Tags <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Ajoutez un tag et appuyez sur Entrée"
                    className={errors.tags ? "border-destructive" : ""}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.tags && (
                  <p className="text-sm text-destructive">{errors.tags}</p>
                )}
                
                {/* Current tags */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        #{tag}
                        <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Suggested tags */}
                {suggestedTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Tags suggérés
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => {
                            if (!formData.tags.includes(tag)) {
                              setFormData({
                                ...formData,
                                tags: [...formData.tags, tag],
                              });
                              setSuggestedTags(suggestedTags.filter((t) => t !== tag));
                            }
                          }}
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* GitHub URL */}
              <div className="space-y-2">
                <Label htmlFor="github_url">URL GitHub (optionnel)</Label>
                <Input
                  id="github_url"
                  type="url"
                  value={formData.github_url}
                  onChange={(e) =>
                    setFormData({ ...formData, github_url: e.target.value, file: null, external_url: "" })
                  }
                  placeholder="https://github.com/username/repo"
                  className={errors.github_url ? "border-destructive" : ""}
                />
                {errors.github_url && (
                  <p className="text-sm text-destructive">
                    {errors.github_url}
                  </p>
                )}
              </div>

              {/* Lien externe */}
              <div className="space-y-2">
                <Label htmlFor="external_url">Lien externe (optionnel)</Label>
                <Input
                  id="external_url"
                  type="url"
                  value={formData.external_url}
                  onChange={(e) =>
                    setFormData({ ...formData, external_url: e.target.value, file: null, github_url: "" })
                  }
                  placeholder="https://exemple.com"
                />
              </div>

              {/* Upload de fichier */}
              <FileUpload
                onFileSelect={(file) => {
                  setFormData({ ...formData, file, github_url: "", external_url: "" });
                }}
                value={formData.file}
                disabled={isSubmitting}
                maxSize={10}
                acceptedTypes={[
                  "image/*",
                  "text/*",
                  "application/json",
                  "application/pdf",
                  "application/javascript",
                  "application/typescript",
                ]}
              />

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Langage principal (optionnel)</Label>
                <Input
                  id="language"
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({ ...formData, language: e.target.value })
                  }
                  placeholder="Ex: TypeScript, Python, etc."
                />
              </div>

              {/* README */}
              <div className="space-y-2">
                <Label htmlFor="readme">README / Documentation (optionnel)</Label>
                <Textarea
                  id="readme"
                  value={formData.readme}
                  onChange={(e) =>
                    setFormData({ ...formData, readme: e.target.value })
                  }
                  placeholder="Ajoutez une documentation en Markdown..."
                  rows={8}
                  className={`font-mono text-sm ${
                    errors.readme ? "border-destructive" : ""
                  }`}
                />
                {errors.readme && (
                  <p className="text-sm text-destructive">{errors.readme}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Publication..." : "Publier la ressource"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Selector Dialog */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choisir un template</DialogTitle>
          </DialogHeader>
          <TemplateSelector
            onSelectTemplate={(template) => {
              handleTemplateSelect(template);
            }}
            onCancel={() => setShowTemplateSelector(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

