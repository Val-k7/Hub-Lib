import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApiTokens, useCreateApiToken, useDeleteApiToken } from "@/hooks/useApiTokens";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Copy, Trash2, Plus, Key, ExternalLink, Calendar } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const ApiSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tokens, isLoading } = useApiTokens();
  const createToken = useCreateApiToken();
  const deleteToken = useDeleteApiToken();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenExpires, setNewTokenExpires] = useState<number | undefined>(undefined);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

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
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du token est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = await createToken.mutateAsync({
        name: newTokenName.trim(),
        expiresInDays: newTokenExpires,
      });
      setCreatedToken(token.token);
      setNewTokenName("");
      setNewTokenExpires(undefined);
    } catch (error) {
      // Erreur déjà gérée par le hook
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "Token copié",
      description: "Le token a été copié dans le presse-papiers",
    });
  };

  const handleDeleteToken = async (tokenId: string) => {
    await deleteToken.mutateAsync(tokenId);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Paramètres API
              </h1>
              <p className="text-lg text-muted-foreground">
                Gérez vos tokens API pour les intégrations externes
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Documentation API
                </CardTitle>
                <CardDescription>
                  Consultez la documentation complète de l'API REST
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => window.open('/api-docs', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir la documentation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tokens API</CardTitle>
                    <CardDescription>
                      Créez et gérez vos tokens d'authentification API
                    </CardDescription>
                  </div>
                  <Dialog
                    open={isCreateDialogOpen}
                    onOpenChange={(open) => {
                      setIsCreateDialogOpen(open);
                      if (!open) {
                        setCreatedToken(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un token
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Créer un nouveau token API</DialogTitle>
                        <DialogDescription>
                          Donnez un nom à votre token pour l'identifier facilement
                        </DialogDescription>
                      </DialogHeader>
                      {createdToken ? (
                        <div className="space-y-4 py-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Votre token :</p>
                            <code className="text-xs break-all">{createdToken}</code>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ⚠️ Copiez ce token maintenant. Il ne sera plus affiché après la fermeture de cette fenêtre.
                          </p>
                          <Button
                            onClick={() => handleCopyToken(createdToken)}
                            className="w-full"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copier le token
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="token-name">Nom du token *</Label>
                            <Input
                              id="token-name"
                              value={newTokenName}
                              onChange={(e) => setNewTokenName(e.target.value)}
                              placeholder="Ex: Mon intégration"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="token-expires">Expiration (en jours, optionnel)</Label>
                            <Input
                              id="token-expires"
                              type="number"
                              value={newTokenExpires || ""}
                              onChange={(e) =>
                                setNewTokenExpires(
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                              placeholder="Laissez vide pour aucun expiration"
                              min="1"
                            />
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        {createdToken ? (
                          <Button onClick={() => setIsCreateDialogOpen(false)}>
                            Fermer
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setIsCreateDialogOpen(false)}
                            >
                              Annuler
                            </Button>
                            <Button
                              onClick={handleCreateToken}
                              disabled={createToken.isPending || !newTokenName.trim()}
                            >
                              Créer
                            </Button>
                          </>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </div>
                ) : tokens && tokens.length > 0 ? (
                  <div className="space-y-4">
                    {tokens.map((token) => (
                      <div
                        key={token.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{token.name}</h3>
                            {token.expires_at &&
                              new Date(token.expires_at) > new Date() && (
                                <Badge variant="outline">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Expire{" "}
                                  {formatDistanceToNow(new Date(token.expires_at), {
                                    addSuffix: true,
                                    locale: fr,
                                  })}
                                </Badge>
                              )}
                            {token.expires_at &&
                              new Date(token.expires_at) <= new Date() && (
                                <Badge variant="destructive">Expiré</Badge>
                              )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              Créé{" "}
                              {formatDistanceToNow(new Date(token.created_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </p>
                            {token.last_used_at && (
                              <p>
                                Dernière utilisation{" "}
                                {formatDistanceToNow(new Date(token.last_used_at), {
                                  addSuffix: true,
                                  locale: fr,
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer le token ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer le token "{token.name}" ?
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteToken(token.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun token créé
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ApiSettings;


