import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TemplateSelector } from "@/components/TemplateSelector";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { templateService } from "@/services/templateService";
import { useToast } from "@/hooks/use-toast";

const Templates = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleTemplateSelect = async (template: any) => {
    if (!user) return;

    try {
      const resource = await templateService.createResourceFromTemplate(
        template.id,
        user.id
      );

      toast({
        title: "Ressource créée !",
        description: `Ressource créée à partir du template "${template.name}"`,
      });

      navigate(`/resource/${resource.id}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la ressource",
        variant: "destructive",
      });
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-12">
        <div className="container mx-auto px-4">
          <TemplateSelector onSelectTemplate={handleTemplateSelect} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Templates;


