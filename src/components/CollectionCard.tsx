import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, Lock, Globe, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteCollection } from "@/hooks/useCollections";
import { useNavigate } from "react-router-dom";

interface CollectionCardProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    resources_count: number;
    cover_image_url: string | null;
    user_id: string;
    updated_at: string;
  };
  isOwner?: boolean;
}

export const CollectionCard = ({ collection, isOwner = false }: CollectionCardProps) => {
  const deleteCollection = useDeleteCollection();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (isOwner && confirm('Êtes-vous sûr de vouloir supprimer cette collection ?')) {
      await deleteCollection.mutateAsync(collection.id);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <FolderOpen className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">
                <Link
                  to={`/collection/${collection.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {collection.name}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {collection.is_public ? (
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Privé
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {collection.resources_count} ressource{collection.resources_count !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/collection/${collection.id}/edit`)}>
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {collection.description && (
          <CardDescription className="mt-2 line-clamp-2">
            {collection.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Link to={`/collection/${collection.id}`}>
          <Button variant="outline" className="w-full">
            Voir la collection
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};


