import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { X, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useResource } from "@/hooks/useResources";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateVersion } from "@/hooks/useVersioning";
import { z } from "zod";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import { PageLoader } from "@/components/LoadingStates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  external_url: z
    .string()
    .trim()
    .url("URL invalide")
    .optional()
    .or(z.literal("")),
  language: z.string().max(50).optional().or(z.literal("")),
  readme: z.string().max(10000, "Le README ne peut pas dépasser 10000 caractères").optional().or(z.literal("")),
});

const EditResource = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: resource, isLoading: resourceLoading } = useResource(id!);
  const createVersion = useCreateVersion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Charger les données de la ressource
  useEffect(() => {
    if (resource) {
      // Vérifier que l'utilisateur est le propriétaire
      if (resource.user_id !== user?.id) {
        toast({
          title: "Accès refusé",
          description: "Vous n'êtes pas autorisé à modifier cette ressource",
          variant: "destructive",
        });
        navigate(`/resource/${id}`);
        return;
      }

      setFormData({
        title: resource.title,
        description: resource.description,
        category: resource.category,
        tags: resource.tags || [],
        github_url: resource.github_url || "",
        external_url: resource.external_url || "",
        language: resource.language || "",
        readme: resource.readme || "",
        visibility: resource.visibility as any,
        file: null, // On ne charge pas le fichier existant pour l'instant
      });
    }
  }, [resource, user, id, navigate, toast]);

  // Récupérer tous les tags existants
  useEffect(() => {
    const fetchExistingTags = async () => {
      try {
        const { data: approvedTags } = await localClient
          .from("category_tag_suggestions")
          .select("name")
          .eq("type", "tag")
          .eq("status", "approved")
          .execute();

        const { data: resources } = await localClient
          .from("resources")
          .select("tags")
          .execute();

        const allTags = new Set<string>();
        approvedTags?.forEach((tag) => allTags.add(tag.name.toLowerCase()));
        resources?.forEach((resource) => {
          resource.tags?.forEach((tag) => allTags.add(tag.toLowerCase()));
        });

        setExistingTags(Array.from(allTags));
      } catch (error) {
        logger.error("Erreur lors de la récupération des tags", undefined, error instanceof Error ? error : new Error(String(error)));
      }
    };

    fetchExistingTags();
  }, []);

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
        visibility: formData.visibility,
      };

      // Si un nouveau fichier est uploadé, le stocker
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

      // Créer une version de la ressource actuelle avant modification
      if (resource) {
        try {
          await createVersion.mutateAsync({
            resourceId: id!,
            resourceData: resource,
            changeSummary: changeSummary.trim() || undefined,
          });
        } catch (versionError) {
          // Ne pas bloquer la mise à jour si la création de version échoue
          logger.warn('Erreur lors de la création de la version', undefined, versionError instanceof Error ? versionError : new Error(String(versionError)));
        }
      }

      const { error } = await localClient
        .from("resources")
        .update(resourceData)
        .eq("id", id!);

      if (error) throw error;

      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["resource-versions", id] });

      toast({
        title: "Ressource mise à jour !",
        description: "Votre ressource a été modifiée avec succès",
      });

      navigate(`/resource/${id}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la ressource",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || resourceLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4">
            <PageLoader message="Chargement..." />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Ressource non trouvée</h1>
            <Button onClick={() => navigate("/browse")}>Retour à l'exploration</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-32 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate(`/resource/${id}`)}
                className="mb-4 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la ressource
              </Button>
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Modifier la <span className="text-primary">Ressource</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Modifiez les informations de votre ressource
              </p>
            </div>

            <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
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

                {/* Change Summary */}
                <div className="space-y-2">
                  <Label htmlFor="changeSummary">
                    Résumé des modifications (optionnel)
                  </Label>
                  <Input
                    id="changeSummary"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Ex: Correction de bugs, ajout de nouvelles fonctionnalités..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Ce résumé sera enregistré dans l'historique des versions
                  </p>
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

                {/* Visibility */}
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibilité</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, visibility: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Privé</SelectItem>
                      <SelectItem value="shared_users">Partagé (utilisateurs)</SelectItem>
                      <SelectItem value="shared_groups">Partagé (groupes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Mise à jour..." : "Mettre à jour la ressource"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/resource/${id}`)}
                    disabled={isSubmitting}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EditResource;

