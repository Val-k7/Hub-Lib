import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminConfigService, type AdminConfig } from "@/services/adminConfigService";
import { useToast } from "@/hooks/use-toast";

export const AdminConfigPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(true);
  const [considerDownvotes, setConsiderDownvotes] = useState(true);

  const { data: allConfigs, isLoading } = useQuery({
    queryKey: ["admin-configs"],
    queryFn: async () => {
      await adminConfigService.initializeConfig();
      return await adminConfigService.getAllConfigs();
    },
  });

  useEffect(() => {
    if (allConfigs) {
      const configMap: Record<string, string> = {};
      allConfigs.forEach((config) => {
        configMap[config.key] = config.value;
        if (config.key === "auto_approval_enabled") {
          setAutoApprovalEnabled(config.value === "true");
        }
        if (config.key === "consider_downvotes") {
          setConsiderDownvotes(config.value === "true");
        }
      });
      setConfigs(configMap);
    }
  }, [allConfigs]);

  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await adminConfigService.setConfig(key, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-configs"] });
      toast({
        title: "Configuration sauvegardée",
        description: "Les modifications ont été enregistrées avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
    },
  });

  const handleSaveAll = async () => {
    const updates = Object.entries(configs).map(([key, value]) =>
      updateConfigMutation.mutateAsync({ key, value })
    );
    
    // Sauvegarder aussi l'état de l'approbation automatique
    await updateConfigMutation.mutateAsync({
      key: "auto_approval_enabled",
      value: autoApprovalEnabled ? "true" : "false",
    });

    // Sauvegarder aussi l'état des downvotes
    await updateConfigMutation.mutateAsync({
      key: "consider_downvotes",
      value: considerDownvotes ? "true" : "false",
    });

    await Promise.all(updates);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement de la configuration...</p>
      </div>
    );
  }

  const configItems = [
    {
      key: "auto_approval_vote_threshold_category",
      label: "Seuil de score pour les catégories",
      description: "Score net (upvotes - downvotes) requis pour l'approbation automatique",
      type: "number" as const,
    },
    {
      key: "auto_approval_vote_threshold_tag",
      label: "Seuil de score pour les tags",
      description: "Score net (upvotes - downvotes) requis pour l'approbation automatique",
      type: "number" as const,
    },
    {
      key: "auto_approval_vote_threshold_resource_type",
      label: "Seuil de score pour les types de ressources",
      description: "Score net (upvotes - downvotes) requis pour l'approbation automatique",
      type: "number" as const,
    },
    {
      key: "auto_approval_vote_threshold_filter",
      label: "Seuil de score pour les filtres",
      description: "Score net (upvotes - downvotes) requis pour l'approbation automatique",
      type: "number" as const,
    },
  ];

  const downvoteConfigItems = [
    {
      key: "auto_rejection_downvote_threshold_category",
      label: "Seuil de downvotes pour les catégories",
      description: "Nombre de downvotes requis pour le rejet automatique",
      type: "number" as const,
    },
    {
      key: "auto_rejection_downvote_threshold_tag",
      label: "Seuil de downvotes pour les tags",
      description: "Nombre de downvotes requis pour le rejet automatique",
      type: "number" as const,
    },
    {
      key: "auto_rejection_downvote_threshold_resource_type",
      label: "Seuil de downvotes pour les types de ressources",
      description: "Nombre de downvotes requis pour le rejet automatique",
      type: "number" as const,
    },
    {
      key: "auto_rejection_downvote_threshold_filter",
      label: "Seuil de downvotes pour les filtres",
      description: "Nombre de downvotes requis pour le rejet automatique",
      type: "number" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configuration des seuils de votes
        </h2>
        <p className="text-muted-foreground">
          Configurez les seuils de votes pour l'approbation automatique des suggestions
        </p>
      </div>

      {/* Toggles pour les options */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-approval" className="text-base font-semibold">
                Approbation automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                Activer l'approbation automatique basée sur le score (upvotes - downvotes)
              </p>
            </div>
            <Switch
              id="auto-approval"
              checked={autoApprovalEnabled}
              onCheckedChange={setAutoApprovalEnabled}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="consider-downvotes" className="text-base font-semibold">
                Prendre en compte les downvotes
              </Label>
              <p className="text-sm text-muted-foreground">
                Activer le rejet automatique basé sur les downvotes
              </p>
            </div>
            <Switch
              id="consider-downvotes"
              checked={considerDownvotes}
              onCheckedChange={setConsiderDownvotes}
            />
          </div>
        </Card>
      </div>

      {/* Configuration des seuils d'approbation */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Seuils d'approbation (score net requis)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Score net = (upvotes - downvotes). Une suggestion est approuvée automatiquement si son score atteint le seuil.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {configItems.map((item) => (
              <Card key={item.key} className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={item.key} className="text-base font-semibold">
                      {item.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id={item.key}
                      type={item.type}
                      value={configs[item.key] || "5"}
                      onChange={(e) =>
                        setConfigs({ ...configs, [item.key]: e.target.value })
                      }
                      className="max-w-[120px]"
                      min="1"
                    />
                    <Badge variant="secondary">score net</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Configuration des seuils de rejet */}
        {considerDownvotes && (
          <div className="space-y-4 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Seuils de rejet (downvotes requis)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Une suggestion est rejetée automatiquement si le nombre de downvotes atteint le seuil ET le score est négatif.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {downvoteConfigItems.map((item) => (
                  <Card key={item.key} className="p-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={item.key} className="text-base font-semibold">
                          {item.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id={item.key}
                          type={item.type}
                          value={configs[item.key] || "3"}
                          onChange={(e) =>
                            setConfigs({ ...configs, [item.key]: e.target.value })
                          }
                          className="max-w-[120px]"
                          min="1"
                        />
                        <Badge variant="secondary">downvotes</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={updateConfigMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updateConfigMutation.isPending ? "Sauvegarde..." : "Sauvegarder tout"}
        </Button>
      </div>
    </div>
  );
};

