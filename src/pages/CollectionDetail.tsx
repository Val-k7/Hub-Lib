import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResourceCard } from "@/components/ResourceCard";
import { useCollection, useUpdateCollection, useDeleteCollection, useAddResourceToCollection, useRemoveResourceFromCollection } from "@/hooks/useCollections";
import { useAuth } from "@/hooks/useAuth";
import { collectionService } from "@/services/collectionService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Trash2, Plus, Globe, Lock, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { localClient } from "@/integrations/local/client";

const CollectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddResourceDialogOpen, setIsAddResourceDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: collection, isLoading: loadingCollection } = useCollection(id || null);
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const addResource = useAddResourceToCollection();
  const removeResource = useRemoveResourceFromCollection();

  const { data: resources, isLoading: loadingResources } = useQuery({
    queryKey: ['collection-resources', id],
    queryFn: () => {
      if (!id) throw new Error('ID requis');
      return collectionService.getCollectionResourcesWithDetails(id);
    },
    enabled: !!id,
  });

  const { data: availableResources } = useQuery({
    queryKey: ['available-resources', searchQuery],
    queryFn: async () => {
      if (!user || !searchQuery.trim()) return [];
      const { data } = await localClient
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(20)
        .execute();
      return data || [];
    },
    enabled: !!user && isAddResourceDialogOpen,
  });

  const isOwner = collection && user && collection.user_id === user.id;

  const handleDelete = async () => {
    if (!id) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer cette collection ?')) {
      await deleteCollection.mutateAsync(id);
      navigate('/collections');
    }
  };

  const handleAddResource = async (resourceId: string) => {
    if (!id) return;
    await addResource.mutateAsync({ collectionId: id, resourceId });
    setIsAddResourceDialogOpen(false);
    setSearchQuery("");
  };

  const handleRemoveResource = async (resourceId: string) => {
    if (!id) return;
    await removeResource.mutateAsync({ collectionId: id, resourceId });
  };

  if (loadingCollection) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4">
            <div className="animate-pulse">Chargement...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Collection introuvable</h1>
              <Button onClick={() => navigate('/collections')}>Retour aux collections</Button>
            </div>
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
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate('/collections')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux collections
              </Button>

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold tracking-tight mb-2">
                    {collection.name}
                  </h1>
                  {collection.description && (
                    <p className="text-lg text-muted-foreground mb-4">
                      {collection.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {collection.is_public ? (
                      <Badge variant="outline">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Lock className="h-3 w-3 mr-1" />
                        Privé
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {collection.resources_count} ressource{collection.resources_count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Modifier la collection</DialogTitle>
                        </DialogHeader>
                        <EditCollectionForm
                          collection={collection}
                          onSave={async (updates) => {
                            await updateCollection.mutateAsync({
                              collectionId: collection.id,
                              updates,
                            });
                            setIsEditDialogOpen(false);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                    <Dialog open={isAddResourceDialogOpen} onOpenChange={setIsAddResourceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter une ressource
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Ajouter une ressource</DialogTitle>
                          <DialogDescription>
                            Recherchez et ajoutez une de vos ressources à cette collection
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Input
                            placeholder="Rechercher une ressource..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <div className="max-h-96 overflow-y-auto space-y-2">
                            {availableResources && availableResources.length > 0 ? (
                              availableResources.map((resource: any) => (
                                <Card key={resource.id} className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold">{resource.title}</h4>
                                      <p className="text-sm text-muted-foreground line-clamp-1">
                                        {resource.description}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddResource(resource.id)}
                                    >
                                      Ajouter
                                    </Button>
                                  </div>
                                </Card>
                              ))
                            ) : (
                              <p className="text-center text-muted-foreground py-8">
                                {searchQuery.trim() ? 'Aucune ressource trouvée' : 'Commencez à rechercher...'}
                              </p>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>

            {loadingResources ? (
              <div className="text-center py-12 text-muted-foreground">
                Chargement des ressources...
              </div>
            ) : resources && resources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((resource: any) => (
                  <div key={resource.id} className="relative">
                    <ResourceCard resource={resource} />
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                        onClick={() => handleRemoveResource(resource.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Cette collection est vide
                  </p>
                  {isOwner && (
                    <Button onClick={() => setIsAddResourceDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une ressource
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

interface EditCollectionFormProps {
  collection: any;
  onSave: (updates: any) => Promise<void>;
}

const EditCollectionForm = ({ collection, onSave }: EditCollectionFormProps) => {
  const [formData, setFormData] = useState({
    name: collection.name,
    description: collection.description || "",
    is_public: collection.is_public,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Nom *</Label>
        <Input
          id="edit-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="edit-public">Collection publique</Label>
        <Switch
          id="edit-public"
          checked={formData.is_public}
          onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
        />
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(formData)}>Enregistrer</Button>
      </DialogFooter>
    </div>
  );
};

export default CollectionDetail;


