import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderTree,
  Tag,
  FileText,
  Filter,
  Sparkles,
  Plus,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Search as SearchIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { VoteButtons } from "@/components/VoteButtons";
import { unifiedMetadataService } from "@/services/unifiedMetadataService";
import { seedInitialData } from "@/services/seedData";
import { logger } from "@/lib/logger";

type SuggestionType = "category" | "tag" | "resource_type" | "filter";
type SuggestionStatus = "pending" | "approved" | "rejected";
type VoteType = "upvote" | "downvote" | null;

interface UnifiedItem {
  id: string;
  name: string;
  description: string | null;
  type: SuggestionType;
  isSuggestion: boolean;
  status?: SuggestionStatus;
  votes_count: number;
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote_type?: VoteType;
  usage_count?: number;
  created_at: string;
}

export default function SuggestionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SuggestionType>("category");
  const [searchQuery, setSearchQuery] = useState("");
  const [newSuggestion, setNewSuggestion] = useState({
    name: "",
    description: "",
    type: "category" as SuggestionType,
  });

  // Initialiser les données au chargement
  useEffect(() => {
    seedInitialData().catch((error) => {
      logger.error('Erreur lors du seeding initial', undefined, error instanceof Error ? error : new Error(String(error)));
    });
  }, []);

  // Fetch unified items (suggestions + existants) for current tab
  const { data: unifiedItems, isLoading } = useQuery({
    queryKey: ["unified-metadata", activeTab, user?.id],
    queryFn: async () => {
      return await unifiedMetadataService.getUnifiedItems(activeTab, user?.id);
    },
  });

  // Filter items by search query
  const filteredItems = unifiedItems?.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  }) || [];

  // Create suggestion mutation (uniquement ajout)
  const createSuggestionMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      type: SuggestionType;
    }) => {
      if (!user) throw new Error("Vous devez être connecté");

      const { error } = await localClient
        .from("category_tag_suggestions")
        .insert({
          name: data.name.trim(),
          description: data.description.trim() || null,
          type: data.type,
          status: "pending",
          suggested_by: user.id,
          votes_count: 0,
          action: "add",
        })
        .execute();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      toast({
        title: "Suggestion créée !",
        description: "Votre suggestion a été soumise à la communauté.",
      });
      setNewSuggestion({ name: "", description: "", type: activeTab });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la suggestion.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour proposer une suggestion.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!newSuggestion.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom est requis.",
        variant: "destructive",
      });
      return;
    }

    createSuggestionMutation.mutate({
      name: newSuggestion.name,
      description: newSuggestion.description,
      type: activeTab,
      action: newSuggestion.action,
    });
  };

  const getTypeLabel = (type: SuggestionType) => {
    switch (type) {
      case "category":
        return "Catégorie";
      case "tag":
        return "Tag";
      case "resource_type":
        return "Type de ressource";
      case "filter":
        return "Filtre";
    }
  };

  const getTypeIcon = (type: SuggestionType) => {
    switch (type) {
      case "category":
        return FolderTree;
      case "tag":
        return Tag;
      case "resource_type":
        return FileText;
      case "filter":
        return Filter;
    }
  };

  const getStatusBadge = (status: SuggestionStatus) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Approuvé
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejeté
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
    }
  };

  const getItemTypeBadge = (isSuggestion: boolean) => {
    if (isSuggestion) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Suggestion
        </Badge>
      );
    }
    return (
      <Badge className="gap-1 bg-green-500 hover:bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Existant
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24 pb-20">
          <Card className="p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Connexion requise</h2>
            <p className="text-muted-foreground mb-6">
              Vous devez être connecté pour proposer ou voter sur des suggestions.
            </p>
            <Button onClick={() => navigate("/auth")}>
              Se connecter
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-12 space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Plateforme de Suggestions</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Proposez et <span className="bg-gradient-primary bg-clip-text text-transparent">Votez</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Participez à l'amélioration de HubLib en proposant de nouveaux éléments ou en suggérant des suppressions basées sur votre expérience
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as SuggestionType);
                          setNewSuggestion({ name: "", description: "", type: value as SuggestionType });
          }} className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="category" className="gap-2">
                <FolderTree className="h-4 w-4" />
                Catégories
              </TabsTrigger>
              <TabsTrigger value="tag" className="gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </TabsTrigger>
              <TabsTrigger value="resource_type" className="gap-2">
                <FileText className="h-4 w-4" />
                Types
              </TabsTrigger>
              <TabsTrigger value="filter" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtres
              </TabsTrigger>
            </TabsList>

            {(["category", "tag", "resource_type", "filter"] as SuggestionType[]).map((type) => {
              const Icon = getTypeIcon(type);
              return (
                <TabsContent key={type} value={type} className="space-y-6 mt-6">
                  {/* Formulaire de nouvelle suggestion */}
                  <Card className="p-6 border-primary/20">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">
                          Proposer une suggestion
                        </h3>
                      </div>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Champ nom */}
                        <div className="space-y-2">
                          <Label htmlFor="name">
                            Nom du/de la {getTypeLabel(type).toLowerCase()}{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="name"
                            value={newSuggestion.name}
                            onChange={(e) =>
                              setNewSuggestion({ ...newSuggestion, name: e.target.value })
                            }
                            placeholder={`Ex: ${type === "category" ? "Outils de développement" : type === "tag" ? "typescript" : type === "resource_type" ? "webhook" : "filtre par date"}`}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description (optionnel)</Label>
                          <Textarea
                            id="description"
                            value={newSuggestion.description}
                            onChange={(e) =>
                              setNewSuggestion({
                                ...newSuggestion,
                                description: e.target.value,
                              })
                            }
                            placeholder="Ajoutez une description pour aider la communauté à comprendre votre suggestion..."
                            rows={3}
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={createSuggestionMutation.isPending || !newSuggestion.name.trim()}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          {createSuggestionMutation.isPending
                            ? "Envoi..."
                            : `Proposer cet(te) ${getTypeLabel(type).toLowerCase()}`}
                        </Button>
                      </form>
                    </div>
                  </Card>

                  {/* Filtre de recherche */}
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Liste unifiée (suggestions + existants) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Tous les éléments ({filteredItems.length})
                      </h3>
                    </div>

                    {isLoading ? (
                      <div className="text-center py-12 text-muted-foreground">
                        Chargement...
                      </div>
                    ) : filteredItems.length > 0 ? (
                      <div className="grid gap-4">
                        {filteredItems.map((item) => (
                          <Card
                            key={item.id}
                            className="p-6 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-lg">{item.name}</h4>
                                  {getItemTypeBadge(item.isSuggestion)}
                                  {item.isSuggestion && item.status && getStatusBadge(item.status)}
                                  {!item.isSuggestion && item.usage_count && (
                                    <Badge variant="outline" className="gap-1">
                                      Utilisé {item.usage_count} fois
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="gap-1">
                                    Score: {item.score > 0 ? "+" : ""}{item.score}
                                  </Badge>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {item.isSuggestion ? (
                                    <>
                                      Proposé le{" "}
                                      {new Date(item.created_at).toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                      })}
                                    </>
                                  ) : (
                                    "Élément existant dans le système"
                                  )}
                                </div>
                              </div>
                              <VoteButtons
                                suggestionId={item.id}
                                currentVoteType={item.user_vote_type || null}
                                upvotes={item.upvotes || 0}
                                downvotes={item.downvotes || 0}
                                score={item.score || 0}
                                size="sm"
                                showCounts={true}
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                          <Icon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Aucun élément</h4>
                          <p className="text-sm text-muted-foreground">
                            Soyez le premier à proposer un ajout !
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

