import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FolderTree, Tag, FileCode } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type MetadataType = "category" | "tag" | "resource_type" | "filter";

interface ProposeMetadataOverlayProps {
  type: MetadataType;
}

export const ProposeMetadataOverlay = ({ type }: ProposeMetadataOverlayProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createSuggestionMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; type: MetadataType }) => {
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
        })
        .execute();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      toast({
        title: "Suggestion envoyée",
        description: "Votre suggestion sera examinée par un administrateur.",
      });
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la suggestion",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom est requis",
        variant: "destructive",
      });
      return;
    }
    createSuggestionMutation.mutate({ name, description, type });
  };

  const getTypeLabel = () => {
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

  const getIcon = () => {
    switch (type) {
      case "category":
        return FolderTree;
      case "tag":
        return Tag;
      case "resource_type":
        return FileCode;
      case "filter":
        return FileCode;
    }
  };

  const Icon = getIcon();

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-full justify-start"
        >
          <Plus className="h-4 w-4" />
          Proposer une {getTypeLabel().toLowerCase()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Proposer une {getTypeLabel().toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Votre suggestion sera examinée par un administrateur avant d'être approuvée.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom de la {getTypeLabel().toLowerCase()} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Ex: ${type === "category" ? "Outils de développement" : type === "tag" ? "typescript" : type === "resource_type" ? "webhook" : "filtre par date"}`}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez une description pour aider les administrateurs à comprendre votre suggestion..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setName("");
                setDescription("");
              }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createSuggestionMutation.isPending || !name.trim()}
            >
              {createSuggestionMutation.isPending ? "Envoi..." : "Envoyer la suggestion"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

