import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShareResourceDialog } from "@/components/ShareResourceDialog";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import { TemplateSelector } from "@/components/TemplateSelector";
import { X, Plus, Sparkles, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { localClient } from "@/integrations/local/client";
import { templateService } from "@/services/templateService";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

const CreateResource = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResourceId, setCreatedResourceId] = useState<string | null>(null);
  const [initialType] = useState(searchParams.get("type") || null);

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
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Gérer le type initial depuis les paramètres de requête
  useEffect(() => {
    if (initialType === "github") {
      // Focus sur le champ GitHub URL
      toast({
        title: "Import GitHub",
        description: "Remplissez l'URL GitHub pour importer un dépôt",
      });
    } else if (initialType === "upload") {
      // Focus sur l'upload de fichier
      toast({
        title: "Upload fichier",
        description: "Sélectionnez un fichier à uploader",
      });
    }
  }, [initialType, toast]);

  // Récupérer tous les tags existants
  useEffect(() => {
    const fetchExistingTags = async () => {
      try {
        // Récupérer les tags approuvés depuis les suggestions
        const { data: approvedTags } = await localClient
          .from("category_tag_suggestions")
          .select("name")
          .eq("type", "tag")
          .eq("status", "approved")
          .execute();

        // Récupérer tous les tags déjà utilisés dans les ressources
        const { data: resources } = await localClient
          .from("resources")
          .select("tags")
          .execute();

        const allTags = new Set<string>();
        
        // Ajouter les tags approuvés
        approvedTags?.forEach((tag) => allTags.add(tag.name.toLowerCase()));
        
        // Ajouter les tags des ressources existantes
        resources?.forEach((resource) => {
          resource.tags?.forEach((tag) => allTags.add(tag.toLowerCase()));
        });

        setExistingTags(Array.from(allTags));
      } catch (error) {
        console.error("Erreur lors de la récupération des tags:", error);
      }
    };

    fetchExistingTags();
  }, []);

  // Suggérer des tags basés sur le contenu
  useEffect(() => {
    const content = `${formData.title} ${formData.description} ${formData.readme} ${formData.language}`.toLowerCase();
    
    const matches = existingTags.filter((tag) => {
      // Ne pas suggérer les tags déjà ajoutés
      if (formData.tags.includes(tag)) return false;
      
      // Vérifier si le tag apparaît dans le contenu
      return content.includes(tag);
    });

    setSuggestedTags(matches.slice(0, 5)); // Limiter à 5 suggestions
  }, [formData.title, formData.description, formData.readme, formData.language, formData.tags, existingTags]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      if (formData.tags.length >= 10) {
        toast({
          title: "Limite atteinte",
          description: "Vous ne pouvez pas ajouter plus de 10 tags",
          variant: "destructive",
        });
        return;
      }
      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleTemplateSelect = async (template: any) => {
    try {
      const resource = await templateService.createResourceFromTemplate(
        template.id,
        user!.id,
        {
          title: template.templateData.title || template.name,
          description: template.templateData.description || template.description,
          category: template.category,
          tags: template.tags,
          language: template.language,
          readme: template.readme,
        }
      );

      toast({
        title: "Ressource créée !",
        description: `Ressource créée à partir du template "${template.name}"`,
      });

      navigate(`/resource/${resource.id}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la ressource depuis le template",
        variant: "destructive",
      });
    } finally {
      setShowTemplateSelector(false);
    }
  };

  const handleLoadTemplate = (template: any) => {
    setFormData({
      ...formData,
      title: template.templateData.title || template.name,
      description: template.templateData.description || template.description,
      category: template.category,
      tags: template.tags || [],
      language: template.language || "",
      readme: template.readme || "",
    });
    setShowTemplateSelector(false);
    toast({
      title: "Template chargé",
      description: `Template "${template.name}" chargé dans le formulaire`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

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
        user_id: user!.id,
        visibility: formData.visibility,
      };

      // Si un fichier est uploadé, le stocker
      if (formData.file) {
        // Stocker le fichier en base64 dans localStorage
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

      toast({
        title: "Ressource créée !",
        description: "Votre ressource a été publiée avec succès",
      });

      navigate(`/resource/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la ressource",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4">
            <div className="animate-pulse">Chargement...</div>
          </div>
        </main>
        <Footer />

        <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choisir un template</DialogTitle>
            </DialogHeader>
            <TemplateSelector
              onSelectTemplate={(template) => {
                // Option 1: Créer directement depuis le template
                handleTemplateSelect(template);
              }}
              onCancel={() => setShowTemplateSelector(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-32 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  Créer une <span className="text-primary">Ressource</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  Partagez votre code, documentation ou connaissances avec la communauté
                </p>
              </div>
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

            <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
              {createdResourceId ? (
                <div className="text-center space-y-6">
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
                      onClick={() => navigate(`/resource/${createdResourceId}`)}
                    >
                      Voir la ressource
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
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

                  {/* Type de ressource */}
                  <div className="space-y-4">
                    <Label>Type de ressource</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        className={cn(
                          "p-4 border-2 rounded-lg cursor-pointer transition-all",
                          !formData.github_url && !formData.file && !formData.external_url
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            github_url: "",
                            external_url: "",
                            file: null,
                          });
                        }}
                      >
                        <p className="font-medium text-sm mb-1">Aucun lien/fichier</p>
                        <p className="text-xs text-muted-foreground">
                          Ressource textuelle uniquement
                        </p>
                      </div>
                    </div>
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
                      rows={10}
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
                      onClick={() => navigate("/my-resources")}
                      disabled={isSubmitting}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateResource;
