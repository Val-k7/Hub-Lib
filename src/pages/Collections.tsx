import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CollectionCard } from "@/components/CollectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserCollections, usePublicCollections, useCreateCollection } from "@/hooks/useCollections";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Collections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    is_public: false,
  });

  const { data: userCollections, isLoading: loadingUser } = useUserCollections();
  const { data: publicCollections, isLoading: loadingPublic } = usePublicCollections(20);
  const createCollection = useCreateCollection();

  const handleCreateCollection = async () => {
    if (!newCollection.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la collection est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const collection = await createCollection.mutateAsync({
        name: newCollection.name.trim(),
        description: newCollection.description.trim() || undefined,
        is_public: newCollection.is_public,
      });

      setIsCreateDialogOpen(false);
      setNewCollection({ name: "", description: "", is_public: false });
      navigate(`/collection/${collection.id}`);
    } catch (error) {
      // L'erreur est déjà gérée par le hook
    }
  };

  const filteredUserCollections = userCollections?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPublicCollections = publicCollections?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  Collections
                </h1>
                <p className="text-lg text-muted-foreground">
                  Organisez vos ressources en collections
                </p>
              </div>
              {user && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une collection
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer une nouvelle collection</DialogTitle>
                      <DialogDescription>
                        Organisez vos ressources en collections pour mieux les retrouver
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom de la collection *</Label>
                        <Input
                          id="name"
                          value={newCollection.name}
                          onChange={(e) =>
                            setNewCollection({ ...newCollection, name: e.target.value })
                          }
                          placeholder="Ex: Mes composants React"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newCollection.description}
                          onChange={(e) =>
                            setNewCollection({ ...newCollection, description: e.target.value })
                          }
                          placeholder="Description de votre collection..."
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="public">Collection publique</Label>
                        <Switch
                          id="public"
                          checked={newCollection.is_public}
                          onCheckedChange={(checked) =>
                            setNewCollection({ ...newCollection, is_public: checked })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button onClick={handleCreateCollection} disabled={createCollection.isPending}>
                        Créer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une collection..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs defaultValue={user ? "my-collections" : "public"} className="w-full">
              <TabsList>
                {user && (
                  <TabsTrigger value="my-collections">Mes collections</TabsTrigger>
                )}
                <TabsTrigger value="public">Collections publiques</TabsTrigger>
              </TabsList>

              {user && (
                <TabsContent value="my-collections" className="mt-6">
                  {loadingUser ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Chargement...
                    </div>
                  ) : filteredUserCollections && filteredUserCollections.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredUserCollections.map((collection) => (
                        <CollectionCard
                          key={collection.id}
                          collection={collection}
                          isOwner={collection.user_id === user.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-4">
                        Vous n'avez pas encore de collections
                      </p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer votre première collection
                      </Button>
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value="public" className="mt-6">
                {loadingPublic ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Chargement...
                  </div>
                ) : filteredPublicCollections && filteredPublicCollections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPublicCollections.map((collection) => (
                      <CollectionCard
                        key={collection.id}
                        collection={collection}
                        isOwner={collection.user_id === user?.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune collection publique trouvée
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Collections;


