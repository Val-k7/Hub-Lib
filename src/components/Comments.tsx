import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Reply, Edit, Trash2, Send } from "lucide-react";
import { useComments, useCreateComment, useUpdateComment, useDeleteComment, Comment } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
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

interface CommentsProps {
  resourceId: string;
}

const CommentItem = ({
  comment,
  resourceId,
  level = 0,
}: {
  comment: Comment;
  resourceId: string;
  level?: number;
}) => {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editContent, setEditContent] = useState(comment.content);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const isOwner = user?.id === comment.user_id;

  const handleReply = () => {
    if (!replyContent.trim()) return;
    createComment.mutate(
      {
        resourceId,
        content: replyContent,
        parentId: comment.id,
      },
      {
        onSuccess: () => {
          setReplyContent("");
          setIsReplying(false);
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editContent.trim()) return;
    updateComment.mutate(
      {
        commentId: comment.id,
        content: editContent,
        resourceId,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteComment.mutate({
      commentId: comment.id,
      resourceId,
    });
  };

  return (
    <div className={`${level > 0 ? "ml-8 mt-4" : ""}`}>
      <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.profiles.avatar_url || undefined} />
            <AvatarFallback>
              {(comment.profiles.username || comment.profiles.full_name || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.profiles.username
                    ? `@${comment.profiles.username}`
                    : comment.profiles.full_name || "Anonyme"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <Badge variant="outline" className="text-xs">
                    Modifié
                  </Badge>
                )}
              </div>

              {isOwner && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="h-7 px-2"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le commentaire</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer ce commentaire ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdate} disabled={updateComment.isPending}>
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            )}

            {!isEditing && (
              <div className="flex items-center gap-4">
                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReplying(!isReplying)}
                    className="h-7 text-xs"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Répondre
                  </Button>
                )}
              </div>
            )}

            {isReplying && (
              <div className="space-y-2 mt-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Écrire une réponse..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={createComment.isPending || !replyContent.trim()}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Envoyer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsReplying(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Réponses */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} resourceId={resourceId} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Comments = ({ resourceId }: CommentsProps) => {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useComments(resourceId);
  const [newComment, setNewComment] = useState("");
  const createComment = useCreateComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    createComment.mutate(
      {
        resourceId,
        content: newComment,
      },
      {
        onSuccess: () => {
          setNewComment("");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Commentaires</h2>
        <Badge variant="secondary">{comments.length}</Badge>
      </div>

      {/* Formulaire de commentaire */}
      {user && (
        <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!newComment.trim() || createComment.isPending}>
                <Send className="h-4 w-4 mr-2" />
                Publier
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!user && (
        <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Connectez-vous pour ajouter un commentaire
          </p>
        </Card>
      )}

      <Separator />

      {/* Liste des commentaires */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Chargement des commentaires...</div>
      ) : comments.length === 0 ? (
        <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun commentaire pour le moment</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} resourceId={resourceId} />
          ))}
        </div>
      )}
    </div>
  );
};

