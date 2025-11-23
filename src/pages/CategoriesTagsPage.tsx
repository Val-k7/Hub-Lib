import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  ThumbsUp, 
  Plus, 
  Tag, 
  FolderTree,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Search as SearchIcon
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { VoteButtons } from "@/components/VoteButtons";

type SuggestionType = "category" | "tag";
type SuggestionStatus = "pending" | "approved" | "rejected";

interface Suggestion {
  id: string;
  name: string;
  description: string | null;
  type: SuggestionType;
  status: SuggestionStatus;
  votes_count: number;
  created_at: string;
  suggested_by: string | null;
  user_voted?: boolean;
}

export default function CategoriesTagsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SuggestionType>("category");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState({
    name: "",
    description: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch existing categories and tags from resources (toutes les ressources, pas seulement publiques)
  const { data: existingItems, isLoading: loadingExisting } = useQuery({
    queryKey: ["existing-items", activeTab],
    queryFn: async () => {
      if (activeTab === "category") {
        // Récupérer toutes les ressources avec catégorie
        const { data, error } = await localClient
          .from("resources")
          .select("category, visibility")
          .not("category", "is", null)
          .execute();

        if (error) throw error;

        // Compter par catégorie, séparer public/privé
        const categoryCounts = data.reduce((acc: Record<string, { total: number; public: number }>, item) => {
          if (!acc[item.category]) {
            acc[item.category] = { total: 0, public: 0 };
          }
          acc[item.category].total += 1;
          if (item.visibility === 'public') {
            acc[item.category].public += 1;
          }
          return acc;
        }, {});

        return Object.entries(categoryCounts).map(([name, counts]) => ({
          name,
          count: counts.total,
          publicCount: counts.public,
        }));
      } else {
        // Récupérer toutes les ressources avec tags
        const { data, error } = await localClient
          .from("resources")
          .select("tags, visibility")
          .not("tags", "is", null)
          .execute();

        if (error) throw error;

        const tagCounts = data.reduce((acc: Record<string, { total: number; public: number }>, item) => {
          if (item.tags) {
            item.tags.forEach((tag: string) => {
              if (!acc[tag]) {
                acc[tag] = { total: 0, public: 0 };
              }
              acc[tag].total += 1;
              if (item.visibility === 'public') {
                acc[tag].public += 1;
              }
            });
          }
          return acc;
        }, {});

        return Object.entries(tagCounts).map(([name, counts]) => ({
          name,
          count: counts.total,
          publicCount: counts.public,
        }));
      }
    },
  });

  // Fetch suggestions
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["suggestions", activeTab],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("category_tag_suggestions")
        .select(`
          *,
          suggestion_votes(user_id, vote_type)
        `)
        .eq("type", activeTab)
        .order("votes_count", { ascending: false });

      if (error) throw error;

      return (data || []).map((suggestion: any) => ({
        ...suggestion,
        user_voted: user ? suggestion.suggestion_votes.some((vote: any) => vote.user_id === user.id) : false,
      }));
    },
  });

  // Create suggestion mutation
  const createSuggestionMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; type: SuggestionType }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await localClient
        .from("category_tag_suggestions")
        .insert({
          name: data.name.trim(),
          description: data.description.trim(),
          type: data.type,
          suggested_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast({
        title: "Suggestion créée !",
        description: "Votre suggestion a été soumise à la communauté.",
      });
      setNewSuggestion({ name: "", description: "" });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la suggestion.",
        variant: "destructive",
      });
    },
  });

  // Note: Le vote est géré via VoteButtons qui utilise useSuggestionVoting

  const handleSubmitSuggestion = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
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
    });
  };

  const getStatusBadge = (status: SuggestionStatus) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Approuvé</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const groupedSuggestions = {
    pending: suggestions?.filter((s) => s.status === "pending") || [],
    approved: suggestions?.filter((s) => s.status === "approved") || [],
    rejected: suggestions?.filter((s) => s.status === "rejected") || [],
  };

  // Filter existing items by search
  const filteredExisting = useMemo(() => {
    if (!existingItems) return [];
    if (!searchTerm) return existingItems;
    return existingItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [existingItems, searchTerm]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16 space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Communauté Active</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Catégories & <span className="bg-gradient-primary bg-clip-text text-transparent">Tags</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Participez à l'évolution de la plateforme en suggérant et votant pour de nouvelles catégories et tags
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SuggestionType)} className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
                <TabsTrigger value="category" className="gap-2">
                  <FolderTree className="h-4 w-4" />
                  Catégories
                </TabsTrigger>
                <TabsTrigger value="tag" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </TabsTrigger>
              </TabsList>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Suggérer {activeTab === "category" ? "une catégorie" : "un tag"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nouvelle suggestion</DialogTitle>
                    <DialogDescription>
                      Suggérez {activeTab === "category" ? "une nouvelle catégorie" : "un nouveau tag"} pour la plateforme
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitSuggestion} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom *</Label>
                      <Input
                        id="name"
                        placeholder={activeTab === "category" ? "Ex: DevOps" : "Ex: kubernetes"}
                        value={newSuggestion.name}
                        onChange={(e) => setNewSuggestion({ ...newSuggestion, name: e.target.value })}
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Décrivez brièvement votre suggestion..."
                        value={newSuggestion.description}
                        onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                        maxLength={500}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={createSuggestionMutation.isPending}>
                        {createSuggestionMutation.isPending ? "Envoi..." : "Soumettre"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <TabsContent value={activeTab} className="space-y-8">
              {/* Search bar */}
              <div className="relative max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={`Rechercher ${activeTab === "category" ? "une catégorie" : "un tag"}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Existing Categories/Tags */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {activeTab === "category" ? <FolderTree className="h-6 w-6 text-primary" /> : <Tag className="h-6 w-6 text-primary" />}
                  {activeTab === "category" ? "Catégories existantes" : "Tags existants"}
                  {existingItems && <Badge variant="secondary">{existingItems.length}</Badge>}
                </h2>
                
                {loadingExisting ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                ) : filteredExisting.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredExisting
                      .sort((a, b) => b.count - a.count)
                      .map((item) => (
                        <Link
                          key={item.name}
                          to={`/browse?${activeTab === "category" ? "category" : "search"}=${encodeURIComponent(item.name)}`}
                        >
                          <Card className="p-4 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                                  {item.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {item.count} {item.count > 1 ? "ressources" : "ressource"}
                                </Badge>
                                {item.publicCount !== undefined && item.publicCount < item.count && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.publicCount} public{item.publicCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                  </div>
                ) : searchTerm ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Aucun résultat pour "{searchTerm}"</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Aucun{activeTab === "category" ? "e catégorie" : " tag"} utilisé pour le moment
                    </p>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="relative py-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-sm text-muted-foreground font-medium">
                    Suggestions de la communauté
                  </span>
                </div>
              </div>

              {/* Pending Suggestions */}
              {groupedSuggestions.pending.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="h-6 w-6 text-yellow-500" />
                    En attente de validation
                    <Badge variant="secondary">{groupedSuggestions.pending.length}</Badge>
                  </h2>
                  <div className="grid gap-4">
                    {groupedSuggestions.pending.map((suggestion) => (
                      <Card key={suggestion.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-semibold">{suggestion.name}</h3>
                              {getStatusBadge(suggestion.status)}
                            </div>
                            {suggestion.description && (
                              <p className="text-muted-foreground">{suggestion.description}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Suggéré le {new Date(suggestion.created_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <VoteButtons
                            suggestionId={suggestion.id}
                            currentVoteType={suggestion.user_vote_type || null}
                            upvotes={suggestion.upvotes || 0}
                            downvotes={suggestion.downvotes || 0}
                            score={suggestion.score !== undefined ? suggestion.score : suggestion.votes_count}
                            size="sm"
                            showCounts={true}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Suggestions */}
              {groupedSuggestions.approved.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    Approuvé
                    <Badge variant="secondary">{groupedSuggestions.approved.length}</Badge>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedSuggestions.approved.map((suggestion) => (
                      <Card key={suggestion.id} className="p-4 bg-green-500/5 border-green-500/20">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{suggestion.name}</h3>
                            <Badge className="bg-green-500">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              {suggestion.votes_count}
                            </Badge>
                          </div>
                          {suggestion.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{suggestion.description}</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {isLoading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              )}

              {!isLoading && suggestions?.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                    {activeTab === "category" ? <FolderTree className="h-8 w-8" /> : <Tag className="h-8 w-8" />}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Aucune suggestion pour le moment</h3>
                    <p className="text-muted-foreground">
                      Soyez le premier à suggérer {activeTab === "category" ? "une catégorie" : "un tag"} !
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
