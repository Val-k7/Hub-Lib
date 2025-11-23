import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Download, Eye, Bookmark, Globe, Lock, Users, User, ExternalLink, FileText, Github } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToggleSaveResource, useSavedResources } from "@/hooks/useResources";
import { useAuth } from "@/hooks/useAuth";
import type { ResourceVisibility } from "@/hooks/useResourceSharing";

interface ResourceCardProps {
  id: string;
  title: string;
  description: string;
  author: string;
  authorUsername?: string;
  category: string;
  tags: string[];
  resourceType: 'file_upload' | 'external_link' | 'github_repo';
  averageRating: number;
  ratingsCount: number;
  downloads: number;
  views: number;
  lastUpdated: string;
  visibility?: ResourceVisibility;
}

export const ResourceCard = ({
  id,
  title,
  description,
  author,
  authorUsername,
  category,
  tags,
  resourceType,
  averageRating,
  ratingsCount,
  downloads,
  views,
  lastUpdated,
  visibility = "public",
}: ResourceCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: savedResources = [] } = useSavedResources();
  const toggleSave = useToggleSaveResource();

  const isSaved = savedResources.some((r) => r.id === id);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    toggleSave.mutate({ resourceId: id, isSaved });
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/resource/${id}`);
  };

  const getVisibilityIcon = () => {
    switch (visibility) {
      case "public": return <Globe className="h-3.5 w-3.5" />;
      case "private": return <Lock className="h-3.5 w-3.5" />;
      case "shared_users": return <User className="h-3.5 w-3.5" />;
      case "shared_groups": return <Users className="h-3.5 w-3.5" />;
    }
  };

  const getVisibilityLabel = () => {
    switch (visibility) {
      case "public": return "Public";
      case "private": return "Privé";
      case "shared_users": return "Partagé";
      case "shared_groups": return "Groupe";
    }
  };

  const getResourceTypeIcon = () => {
    switch (resourceType) {
      case 'file_upload': return <FileText className="h-3.5 w-3.5" />;
      case 'external_link': return <ExternalLink className="h-3.5 w-3.5" />;
      case 'github_repo': return <Github className="h-3.5 w-3.5" />;
    }
  };

  const getResourceTypeLabel = () => {
    switch (resourceType) {
      case 'file_upload': return "Fichier";
      case 'external_link': return "Lien";
      case 'github_repo': return "GitHub";
    }
  };

  return (
    <Card
      onClick={handleViewDetails}
      className="p-6 hover:shadow-elegant transition-all duration-300 cursor-pointer group border-border/50 bg-card/80 backdrop-blur-sm"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              par{" "}
              {authorUsername ? (
                <span
                  className="font-medium hover:text-primary cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${authorUsername}`);
                  }}
                >
                  @{authorUsername}
                </span>
              ) : (
                <span className="font-medium">{author}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Badge 
              variant="outline" 
              className="flex items-center gap-1"
              title={getResourceTypeLabel()}
            >
              {getResourceTypeIcon()}
              <span className="hidden sm:inline">{getResourceTypeLabel()}</span>
            </Badge>
            <Badge 
              variant="outline" 
              className="flex items-center gap-1"
              title={getVisibilityLabel()}
            >
              {getVisibilityIcon()}
              <span className="hidden sm:inline">{getVisibilityLabel()}</span>
            </Badge>
            <Badge variant="secondary">
              {category}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {tags.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 4}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1" title={`${ratingsCount} note${ratingsCount > 1 ? 's' : ''}`}>
            <Star className={`h-3.5 w-3.5 ${averageRating > 0 ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            <span>{averageRating > 0 ? averageRating.toFixed(1) : '—'}</span>
            <span className="text-muted-foreground/60">({ratingsCount})</span>
          </div>
          <div className="flex items-center gap-1" title="Téléchargements">
            <Download className="h-3.5 w-3.5" />
            <span>{downloads}</span>
          </div>
          <div className="flex items-center gap-1" title="Vues">
            <Eye className="h-3.5 w-3.5" />
            <span>{views}</span>
          </div>
          <div className="ml-auto text-xs">
            Mis à jour {lastUpdated}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            onClick={handleViewDetails}
          >
            <Eye className="h-4 w-4" />
            Voir Détails
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSave}
            disabled={toggleSave.isPending}
          >
            <Bookmark
              className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`}
            />
          </Button>
        </div>
      </div>
    </Card>
  );
};
