import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, UserPlus, Trash2 } from "lucide-react";
import { useGroups, useCreateGroup, useGroupMembers, useAddGroupMember, useRemoveGroupMember, useUpdateGroupMemberRole } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/LoadingStates";
import { UserSearch } from "@/components/UserSearch";
import { useToast } from "@/hooks/use-toast";

const Groups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  const { data: groups = [], isLoading } = useGroups();
  const { data: members = [] } = useGroupMembers(selectedGroupId || "");
  const createGroup = useCreateGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const updateRole = useUpdateGroupMemberRole();

  const handleCreateGroup = async () => {
    await createGroup.mutateAsync({
      name: newGroupName,
      description: newGroupDescription,
    });
    setNewGroupName("");
    setNewGroupDescription("");
    setCreateDialogOpen(false);
  };

  const handleSelectUser = async (userId: string) => {
    if (!selectedGroupId) return;

    // Vérifier si l'utilisateur n'est pas déjà membre
    const isAlreadyMember = members.some((m) => m.user_id === userId);
    if (isAlreadyMember) {
      toast({
        title: "Utilisateur déjà membre",
        description: "Cet utilisateur fait déjà partie du groupe",
        variant: "destructive",
      });
      return;
    }

    addMember.mutate(
      { groupId: selectedGroupId, userId },
      {
        onSuccess: () => {
          toast({
            title: "Membre ajouté",
            description: "L'utilisateur a été ajouté au groupe avec succès",
          });
        },
      }
    );
  };

  // Liste des IDs des utilisateurs déjà membres pour les exclure de la recherche
  const existingMemberIds = members.map((m) => m.user_id);

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="pt-32 pb-12 bg-gradient-hero border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Mes <span className="bg-gradient-primary bg-clip-text text-transparent">Groupes</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Gérez vos groupes et partagez des ressources avec vos équipes
            </p>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Créer un groupe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau groupe</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nom du groupe</Label>
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Mon équipe"
                    />
                  </div>
                  <div>
                    <Label>Description (optionnel)</Label>
                    <Textarea
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Description du groupe..."
                    />
                  </div>
                  <Button 
                    onClick={handleCreateGroup} 
                    disabled={!newGroupName || createGroup.isPending}
                    className="w-full"
                  >
                    Créer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <main className="flex-1 py-12 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <Card key={group.id} className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {group.owner_id === user?.id ? "Propriétaire" : "Membre"}
                    </Badge>
                  </div>

                  {group.owner_id === user?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Gérer les membres
                    </Button>
                  )}
                </Card>
              ))}
            </div>

            {groups.length === 0 && (
              <Card className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun groupe</h3>
                <p className="text-muted-foreground mb-4">
                  Créez votre premier groupe pour partager des ressources avec votre équipe
                </p>
              </Card>
            )}
          </div>

          {/* Members Dialog */}
          {selectedGroupId && (
            <Dialog open={!!selectedGroupId} onOpenChange={() => setSelectedGroupId(null)}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Membres du groupe</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ajouter un membre</Label>
                    <UserSearch
                      onSelectUser={handleSelectUser}
                      placeholder="Rechercher par nom d'utilisateur..."
                      excludeUserIds={existingMemberIds}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recherchez un utilisateur par son nom d'utilisateur ou son nom complet
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Membres actuels</Label>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Aucun membre pour le moment
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg border gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {member.profiles.username || member.profiles.full_name || "Anonyme"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Select
                                  value={member.role}
                                  onValueChange={(newRole) => {
                                    updateRole.mutate({
                                      groupId: selectedGroupId!,
                                      userId: member.user_id,
                                      role: newRole,
                                    });
                                  }}
                                  disabled={member.user_id === user?.id}
                                >
                                  <SelectTrigger className="h-7 w-[120px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">
                                      <div className="flex items-center gap-2">
                                        <Shield className="h-3 w-3" />
                                        Admin
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="member">
                                      <div className="flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        Membre
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember.mutate({ 
                                groupId: selectedGroupId, 
                                userId: member.user_id 
                              })}
                              disabled={member.user_id === user?.id}
                              title={member.user_id === user?.id ? "Vous ne pouvez pas vous retirer" : "Retirer le membre"}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Groups;
