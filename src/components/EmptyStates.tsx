import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Search, 
  FileText, 
  Inbox, 
  AlertCircle, 
  PackageOpen,
  FolderOpen,
  Tag,
  Plus,
  LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * Generic empty state component
 */
export const EmptyState = ({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action,
  secondaryAction 
}: EmptyStateProps) => {
  return (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        
        {(action || secondaryAction) && (
          <div className="flex gap-3 pt-2">
            {action && (
              action.href ? (
                <Link to={action.href}>
                  <Button size="lg" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {action.label}
                  </Button>
                </Link>
              ) : (
                <Button size="lg" onClick={action.onClick} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {action.label}
                </Button>
              )
            )}
            
            {secondaryAction && (
              secondaryAction.href ? (
                <Link to={secondaryAction.href}>
                  <Button variant="outline" size="lg">
                    {secondaryAction.label}
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="lg" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * No search results state
 */
export const NoSearchResults = ({ searchQuery }: { searchQuery: string }) => {
  return (
    <EmptyState
      icon={Search}
      title="Aucun résultat trouvé"
      description={`Aucune ressource ne correspond à "${searchQuery}". Essayez avec d'autres mots-clés ou filtres.`}
      secondaryAction={{
        label: "Réinitialiser les filtres",
        onClick: () => window.location.reload()
      }}
    />
  );
};

/**
 * No resources state
 */
export const NoResources = () => {
  return (
    <EmptyState
      icon={PackageOpen}
      title="Aucune ressource disponible"
      description="Soyez le premier à partager une ressource avec la communauté ! Créez votre première ressource dès maintenant."
      action={{
        label: "Créer une ressource",
        href: "/create"
      }}
      secondaryAction={{
        label: "Explorer les catégories",
        href: "/categories-tags"
      }}
    />
  );
};

/**
 * No saved resources state
 */
export const NoSavedResources = () => {
  return (
    <EmptyState
      icon={FileText}
      title="Aucune ressource sauvegardée"
      description="Vous n'avez pas encore sauvegardé de ressources. Parcourez les ressources et ajoutez-les à vos favoris."
      action={{
        label: "Explorer les ressources",
        href: "/browse"
      }}
    />
  );
};

/**
 * No user resources state
 */
export const NoUserResources = () => {
  return (
    <EmptyState
      icon={FolderOpen}
      title="Aucune ressource créée"
      description="Vous n'avez pas encore créé de ressources. Partagez votre code, documentation ou connaissances avec la communauté."
      action={{
        label: "Créer ma première ressource",
        href: "/create"
      }}
    />
  );
};

/**
 * No suggestions state
 */
export const NoSuggestions = () => {
  return (
    <EmptyState
      icon={Tag}
      title="Aucune suggestion"
      description="Il n'y a pas encore de suggestions pour le moment. Soyez le premier à proposer une nouvelle catégorie ou un nouveau tag !"
      action={{
        label: "Faire une suggestion",
        onClick: () => {} // Will be handled by parent component
      }}
    />
  );
};

/**
 * Error state
 */
export const ErrorState = ({ 
  message = "Une erreur est survenue",
  onRetry 
}: { 
  message?: string;
  onRetry?: () => void;
}) => {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Erreur de chargement"
      description={message}
      action={onRetry ? {
        label: "Réessayer",
        onClick: onRetry
      } : undefined}
      secondaryAction={{
        label: "Retour à l'accueil",
        href: "/"
      }}
    />
  );
};

/**
 * Access denied state
 */
export const AccessDenied = () => {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Accès refusé"
      description="Vous n'avez pas les permissions nécessaires pour accéder à cette page. Veuillez vous connecter ou contacter un administrateur."
      action={{
        label: "Se connecter",
        href: "/auth"
      }}
      secondaryAction={{
        label: "Retour à l'accueil",
        href: "/"
      }}
    />
  );
};
