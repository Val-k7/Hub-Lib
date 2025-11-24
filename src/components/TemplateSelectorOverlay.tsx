/**
 * Overlay pour sélectionner un template
 * Utilise un Dialog pour afficher le sélecteur de templates
 */

import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TemplateSelector } from "@/components/TemplateSelector";
import { useAuth } from "@/hooks/useAuth";
import { templateService, type ResourceTemplate } from "@/services/templateService";
import { useToast } from "@/hooks/use-toast";
import { useTemplateSelector } from "@/contexts/TemplateSelectorContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TemplateSelectorOverlay = () => {
  const { isOpen, closeTemplateSelector } = useTemplateSelector();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleTemplateSelect = async (template: ResourceTemplate) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour utiliser un template",
        variant: "destructive",
      });
      return;
    }

    try {
      const resource = await templateService.createResourceFromTemplate(
        template.id,
        user.id
      );

      toast({
        title: "Ressource créée !",
        description: `Ressource créée à partir du template "${template.name}"`,
      });

      closeTemplateSelector();
      navigate(`/resource/${resource.id}`);
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible de créer la ressource",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeTemplateSelector}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              Choisir un <span className="text-primary">Template</span>
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={closeTemplateSelector}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <TemplateSelector
          onSelectTemplate={handleTemplateSelect}
          onCancel={closeTemplateSelector}
        />
      </DialogContent>
    </Dialog>
  );
};

