import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Github, 
  Trash2, 
  Star,
  LoaderCircle,
  AlertCircle
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { oauthAccountService, type OAuthAccount, type OAuthProvider } from "@/services/oauthAccountService";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const getProviderIcon = (provider: OAuthProvider) => {
  switch (provider) {
    case 'github':
      return <Github className="h-5 w-5" />;
    case 'google':
      return <FcGoogle className="h-5 w-5" />;
  }
};

const getProviderName = (provider: OAuthProvider) => {
  switch (provider) {
    case 'github':
      return 'GitHub';
    case 'google':
      return 'Google';
  }
};

export const OAuthAccountsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unlinkAccountId, setUnlinkAccountId] = useState<string | null>(null);

  // Récupérer les comptes OAuth
  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['oauth-accounts'],
    queryFn: () => oauthAccountService.getOAuthAccounts(),
  });

  // Mutation pour délier un compte
  const unlinkMutation = useMutation({
    mutationFn: (accountId: string) => oauthAccountService.unlinkOAuthAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-accounts'] });
      toast({
        title: "Compte délié",
        description: "Le compte OAuth a été délié avec succès.",
      });
      setUnlinkAccountId(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de délier le compte OAuth.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour définir comme principal
  const setPrimaryMutation = useMutation({
    mutationFn: (accountId: string) => oauthAccountService.setPrimaryOAuthAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-accounts'] });
      toast({
        title: "Compte principal mis à jour",
        description: "Le compte principal a été mis à jour avec succès.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de définir le compte principal.",
        variant: "destructive",
      });
    },
  });

  // Grouper les comptes par provider
  const accountsByProvider = accounts.reduce((acc, account) => {
    if (!acc[account.provider]) {
      acc[account.provider] = [];
    }
    acc[account.provider].push(account);
    return acc;
  }, {} as Record<OAuthProvider, OAuthAccount[]>);

  const handleLinkAccount = (provider: OAuthProvider) => {
    oauthAccountService.initiateOAuthLink(provider);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>Erreur lors du chargement des comptes OAuth</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Comptes connectés</h3>
        <p className="text-sm text-muted-foreground">
          Gérez vos comptes OAuth liés pour partager des ressources vers GitHub ou Google Drive
        </p>
      </div>

      {/* GitHub */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <span className="font-medium">GitHub</span>
          </div>
          {!accountsByProvider.github || accountsByProvider.github.length === 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLinkAccount('github')}
            >
              Lier un compte
            </Button>
          ) : null}
        </div>

        {accountsByProvider.github && accountsByProvider.github.length > 0 ? (
          <div className="space-y-2">
            {accountsByProvider.github.map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-muted">
                      {getProviderIcon(account.provider)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {account.metadata?.username || account.providerUserId}
                        </span>
                        {account.isPrimary && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      {account.providerEmail && (
                        <p className="text-sm text-muted-foreground">{account.providerEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryMutation.mutate(account.id)}
                        disabled={setPrimaryMutation.isPending}
                      >
                        Définir comme principal
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUnlinkAccountId(account.id)}
                      disabled={unlinkMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      {/* Google */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FcGoogle className="h-5 w-5" />
            <span className="font-medium">Google</span>
          </div>
          {!accountsByProvider.google || accountsByProvider.google.length === 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLinkAccount('google')}
            >
              Lier un compte
            </Button>
          ) : null}
        </div>

        {accountsByProvider.google && accountsByProvider.google.length > 0 ? (
          <div className="space-y-2">
            {accountsByProvider.google.map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-muted">
                      {getProviderIcon(account.provider)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {account.metadata?.name || account.providerEmail || account.providerUserId}
                        </span>
                        {account.isPrimary && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      {account.providerEmail && (
                        <p className="text-sm text-muted-foreground">{account.providerEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryMutation.mutate(account.id)}
                        disabled={setPrimaryMutation.isPending}
                      >
                        Définir comme principal
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUnlinkAccountId(account.id)}
                      disabled={unlinkMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      {/* Dialog de confirmation pour délier */}
      <AlertDialog open={!!unlinkAccountId} onOpenChange={(open) => !open && setUnlinkAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Délier le compte OAuth</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir délier ce compte OAuth ? Vous ne pourrez plus partager des ressources vers ce service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (unlinkAccountId) {
                  unlinkMutation.mutate(unlinkAccountId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Délier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

