import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Users, User, Globe, Lock, Edit, Trash2, Calendar } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import {
  useUpdateResourceVisibility,
  useShareResource,
  useResourceShares,
  useUnshareResource,
  useUpdateSharePermission,
  ResourceVisibility,
  SharePermission,
} from "@/hooks/useResourceSharing";
import {
  useResourcePermissions,
  useCreateResourcePermission,
  useDeleteResourcePermission,
} from "@/hooks/useResourcePermissions";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ShareResourceDialogProps {
  resourceId: string;
  currentVisibility: ResourceVisibility;
}

export const ShareResourceDialog = ({ resourceId, currentVisibility }: ShareResourceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<ResourceVisibility>(currentVisibility);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [sharePermission, setSharePermission] = useState<SharePermission>("read");
  const [shareExpiration, setShareExpiration] = useState<string>("");
  const [editingShareId, setEditingShareId] = useState<string | null>(null);

  const { data: groups } = useGroups();
  const { data: shares } = useResourceShares(resourceId);
  const { data: resourcePermissions } = useResourcePermissions(resourceId);
  const updateVisibility = useUpdateResourceVisibility();
  const shareResource = useShareResource();
  const unshareResource = useUnshareResource();
  const updateSharePermission = useUpdateSharePermission();
  const createResourcePermission = useCreateResourcePermission();
  const deleteResourcePermission = useDeleteResourcePermission();
  const [permissionTarget, setPermissionTarget] = useState<"user" | "group">("user");
  const [permissionUserId, setPermissionUserId] = useState("");
  const [permissionGroupId, setPermissionGroupId] = useState("");
  const [customPermission, setCustomPermission] = useState("resource:read");
  const [permissionExpiresAt, setPermissionExpiresAt] = useState("");

  const canCreateAdvancedPermission =
    customPermission.trim().length > 0 &&
    (permissionTarget === "user" ? permissionUserId.trim().length > 0 : permissionGroupId.length > 0);

  const permissionPresets = [
    { value: "resource:read", label: "Lecture (resource:read)" },
    { value: "resource:write", label: "Écriture (resource:write)" },
    { value: "resource:update", label: "Mise à jour (resource:update)" },
    { value: "resource:delete", label: "Suppression (resource:delete)" },
    { value: "resource:share", label: "Partage (resource:share)" },
  ];

  const handleVisibilityChange = (newVisibility: ResourceVisibility) => {
    setVisibility(newVisibility);
    updateVisibility.mutate({ resourceId, visibility: newVisibility });
  };

  const handleShareWithGroup = () => {
    if (!selectedGroup) return;
    shareResource.mutate({
      resourceId,
      groupId: selectedGroup,
      permission: sharePermission,
      expiresAt: shareExpiration || null,
    });
    setSelectedGroup("");
    setSharePermission("read");
    setShareExpiration("");
  };

  const handleUpdatePermission = (shareId: string, permission: SharePermission, expiresAt?: string | null) => {
    updateSharePermission.mutate({ resourceId, shareId, permission, expiresAt });
    setEditingShareId(null);
  };

  const handleCreateAdvancedPermission = () => {
    if (!canCreateAdvancedPermission) return;

    createResourcePermission.mutate(
      {
        resourceId,
        payload: {
          userId: permissionTarget === "user" ? permissionUserId.trim() : undefined,
          groupId: permissionTarget === "group" ? permissionGroupId : undefined,
          permission: customPermission.trim(),
          expiresAt: permissionExpiresAt || null,
        },
      },
      {
        onSuccess: () => {
          setPermissionUserId("");
          setPermissionGroupId("");
          setPermissionExpiresAt("");
        },
      }
    );
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getVisibilityIcon = (vis: ResourceVisibility) => {
    switch (vis) {
      case "public": return <Globe className="h-4 w-4" />;
      case "private": return <Lock className="h-4 w-4" />;
      case "shared_users": return <User className="h-4 w-4" />;
      case "shared_groups": return <Users className="h-4 w-4" />;
    }
  };

  const getVisibilityLabel = (vis: ResourceVisibility) => {
    switch (vis) {
      case "public": return "Public";
      case "private": return "Privé";
      case "shared_users": return "Partagé avec utilisateurs";
      case "shared_groups": return "Partagé avec groupes";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Partager la ressource</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Visibility Selector */}
          <div className="space-y-2">
            <Label>Visibilité</Label>
            <Select value={visibility} onValueChange={(v) => handleVisibilityChange(v as ResourceVisibility)}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {getVisibilityIcon(visibility)}
                    <span>{getVisibilityLabel(visibility)}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>Public - Visible par tous</span>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Privé - Seulement vous</span>
                  </div>
                </SelectItem>
                <SelectItem value="shared_groups">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Groupes - Partager avec groupes</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Share with Groups */}
          {visibility === "shared_groups" && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Partager avec un groupe</Label>
                  <div className="flex gap-2">
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sélectionner un groupe" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleShareWithGroup} disabled={!selectedGroup}>
                      Ajouter
                    </Button>
                  </div>
                </div>

                {/* Permission and expiration for new share */}
                {selectedGroup && (
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <Label>Permission</Label>
                      <Select value={sharePermission} onValueChange={(v) => setSharePermission(v as SharePermission)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Lecture seule</SelectItem>
                          <SelectItem value="write">Lecture-écriture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Expiration (optionnel)</Label>
                      <Input
                        type="datetime-local"
                        value={shareExpiration}
                        onChange={(e) => setShareExpiration(e.target.value)}
                        placeholder="Date d'expiration"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Current Shares */}
              {shares && shares.length > 0 && (
                <div className="space-y-2">
                  <Label>Actuellement partagé avec</Label>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <div className="space-y-3">
                      {shares.map((share) => {
                        const expired = isExpired(share.expiresAt);
                        const isEditing = editingShareId === share.id;
                        
                        return (
                          <div
                            key={share.id}
                            className={`p-3 rounded-lg border ${
                              expired ? "bg-destructive/10 border-destructive/50" : "bg-card"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={expired ? "destructive" : "secondary"}>
                                  {share.sharedWithGroupId ? "Groupe" : "Utilisateur"}
                                </Badge>
                                <Badge variant="outline">
                                  {share.permission === "read" ? "Lecture seule" : "Lecture-écriture"}
                                </Badge>
                                {expired && <Badge variant="destructive">Expiré</Badge>}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingShareId(isEditing ? null : share.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => unshareResource.mutate({ resourceId, shareId: share.id })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {share.expiresAt && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Expire le {format(new Date(share.expiresAt), "PPp", { locale: fr })}
                                </span>
                              </div>
                            )}

                            {isEditing && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <Select
                                  value={share.permission}
                                  onValueChange={(v) =>
                                    handleUpdatePermission(share.id, v as SharePermission, share.expiresAt)
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="read">Lecture seule</SelectItem>
                                    <SelectItem value="write">Lecture-écriture</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="datetime-local"
                                  value={share.expiresAt ? format(new Date(share.expiresAt), "yyyy-MM-dd'T'HH:mm") : ""}
                                  onChange={(e) =>
                                    handleUpdatePermission(
                                      share.id,
                                      share.permission,
                                      e.target.value || null
                                    )
                                  }
                                  className="h-8"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}

          <Separator />
          <div className="space-y-4">
            <div>
              <Label>Permissions avancées</Label>
              <p className="text-sm text-muted-foreground">
                Accordez un droit précis (lecture, modification, suppression) à un utilisateur ou à un groupe, même si la
                ressource n&apos;est pas partagée globalement.
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cible</Label>
                    <Select value={permissionTarget} onValueChange={(v) => setPermissionTarget(v as "user" | "group")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir la cible" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Utilisateur</SelectItem>
                        <SelectItem value="group">Groupe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expiration (optionnel)</Label>
                    <Input
                      type="datetime-local"
                      value={permissionExpiresAt}
                      onChange={(e) => setPermissionExpiresAt(e.target.value)}
                    />
                  </div>
                </div>
                {permissionTarget === "user" ? (
                  <div className="space-y-1.5">
                    <Label>ID utilisateur</Label>
                    <Input
                      placeholder="UUID de l'utilisateur"
                      value={permissionUserId}
                      onChange={(e) => setPermissionUserId(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Groupe</Label>
                    <Select value={permissionGroupId} onValueChange={setPermissionGroupId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un groupe" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {permissionPresets.map((preset) => (
                      <Button
                        key={preset.value}
                        type="button"
                        variant={customPermission === preset.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCustomPermission(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <Input
                    placeholder="resource:action (ex: resource:read)"
                    value={customPermission}
                    onChange={(e) => setCustomPermission(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleCreateAdvancedPermission}
                  disabled={!canCreateAdvancedPermission || createResourcePermission.isPending}
                >
                  {createResourcePermission.isPending ? "Ajout..." : "Ajouter la permission"}
                </Button>
              </div>
              {resourcePermissions && resourcePermissions.length > 0 ? (
                <ScrollArea className="h-[180px] w-full rounded-md border p-4">
                  <div className="space-y-3">
                    {resourcePermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="rounded-lg border p-3 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {permission.user
                                ? permission.user.username || permission.user.fullName || permission.user.email
                                : permission.group
                                  ? permission.group.name
                                  : "Permission"}
                            </Badge>
                            <Badge variant="outline">{permission.permission}</Badge>
                          </div>
                          {permission.expiresAt && (
                            <p className="text-xs text-muted-foreground">
                              Expire le {format(new Date(permission.expiresAt), "PPp", { locale: fr })}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteResourcePermission.mutate({ resourceId, permissionId: permission.id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune permission avancée n&apos;a été définie.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
