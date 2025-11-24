import { useState, useMemo, useEffect, type FormEvent } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  XCircle,
  Shield,
  TrendingUp,
  FolderTree,
  Tag,
  Globe,
  FileText,
  Eye,
  Trash2,
  Edit2,
  Save,
  X,
  Settings,
  Clock,
  Filter,
  Users,
  ShieldCheck,
  History,
  Download,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin, useIsSuperAdmin, usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { useSuggestionVoting } from "@/hooks/useSuggestionVoting";
import { useAuth } from "@/hooks/useAuth";
import { AdminConfigPanel } from "@/components/AdminConfigPanel";
import { VoteButtons } from "@/components/VoteButtons";
import { adminConfigService } from "@/services/adminConfigService";
import { userManagementService, type User } from "@/services/userManagementService";
import { logger } from "@/lib/logger";
import { adminPermissionsService, type PermissionAuditAction } from "@/services/adminPermissionsService";
import type { AppRole } from "@/types/permissions";

type SuggestionType = "category" | "tag" | "resource_type" | "filter" | "resources" | "users";
type SuggestionStatus = "pending" | "approved" | "rejected";

interface Suggestion {
  id: string;
  name: string;
  description: string | null;
  type: SuggestionType;
  status: SuggestionStatus;
  votes_count: number;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  profiles?: {
    username: string | null;
    full_name: string | null;
  } | null;
}

type AdminTab = SuggestionType | "config" | "permissions" | "audit";

export default function AdminPanel() {
  const isAdmin = useIsAdmin();
  const isSuperAdmin = useIsSuperAdmin();
  const canAccessAdmin = isAdmin || isSuperAdmin;
  const { loading: roleLoading } = usePermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("category");
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | "all">("all");
  const [editingItem, setEditingItem] = useState<{ type: "category" | "tag"; name: string; newName: string } | null>(null);
  const [editingSuggestion, setEditingSuggestion] = useState<{ id: string; name: string; description: string } | null>(null);
  const [showConfigTab, setShowConfigTab] = useState(false);
  const { user } = useAuth();
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionResourceFilter, setPermissionResourceFilter] = useState<string>("all");
  const [permissionRoleFilter, setPermissionRoleFilter] = useState<AppRole | "all">("all");
  const [newPermission, setNewPermission] = useState({ resource: "", action: "", description: "" });
  const [permissionAssignSelections, setPermissionAssignSelections] = useState<Record<string, AppRole | "">>({});
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState<PermissionAuditAction | "all">("all");
  const [auditRoleFilter, setAuditRoleFilter] = useState<AppRole | "all">("all");
  const [auditActorFilter, setAuditActorFilter] = useState("");

  // Fetch existing categories and tags
  const { data: existingCategories, isLoading: loadingCategories } = useQuery({
    queryKey: ["admin-existing-categories"],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resources")
        .select("category, visibility")
        .not("category", "is", null)
        .execute();

      if (error) throw error;

      const categoryCounts = data.reduce((acc: Record<string, { total: number; public: number }>, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { total: 0, public: 0 };
        }
        acc[item.category].total += 1;
        if (item.visibility === 'public') {
          acc[item.category].public += 1;
        }
        return acc;
      }, {});

      return Object.entries(categoryCounts)
        .map(([name, counts]: [string, { total: number; public: number }]) => ({
          name,
          total: counts.total,
          public: counts.public,
        }))
        .sort((a, b) => b.total - a.total);
    },
    enabled: canAccessAdmin && !roleLoading,
  });

  const { data: existingTags, isLoading: loadingTags } = useQuery({
    queryKey: ["admin-existing-tags"],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resources")
        .select("tags, visibility")
        .not("tags", "is", null)
        .execute();

      if (error) throw error;

      const tagCounts = data.reduce((acc: Record<string, { total: number; public: number }>, item) => {
        if (item.tags) {
          item.tags.forEach((tag: string) => {
            if (!acc[tag]) {
              acc[tag] = { total: 0, public: 0 };
            }
            acc[tag].total += 1;
            if (item.visibility === 'public') {
              acc[tag].public += 1;
            }
          });
        }
        return acc;
      }, {});

      return Object.entries(tagCounts)
        .map(([name, counts]: [string, { total: number; public: number }]) => ({
          name,
          total: counts.total,
          public: counts.public,
        }))
        .sort((a, b) => b.total - a.total);
    },
    enabled: canAccessAdmin && !roleLoading,
  });

  // Fetch existing resource types
  const { data: existingResourceTypes, isLoading: loadingResourceTypes } = useQuery({
    queryKey: ["admin-existing-resource-types"],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resources")
        .select("resource_type, visibility")
        .not("resource_type", "is", null)
        .execute();

      if (error) throw error;

      const typeCounts = data.reduce((acc: Record<string, { total: number; public: number }>, item) => {
        if (item.resource_type) {
          if (!acc[item.resource_type]) {
            acc[item.resource_type] = { total: 0, public: 0 };
          }
          acc[item.resource_type].total += 1;
          if (item.visibility === 'public') {
            acc[item.resource_type].public += 1;
          }
        }
        return acc;
      }, {});

      return Object.entries(typeCounts)
        .map(([name, counts]: [string, { total: number; public: number }]) => ({
          name,
          total: counts.total,
          public: counts.public,
        }))
        .sort((a, b) => b.total - a.total);
    },
    enabled: canAccessAdmin && !roleLoading,
  });

  // Fetch public resources for admin management
  const { data: publicResources, isLoading: loadingResources } = useQuery({
    queryKey: ["admin-public-resources", searchQuery],
    queryFn: async () => {
      let query = localClient
        .from("resources")
        .select("*, profiles(*)")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (searchQuery.trim()) {
        const { data: allResources } = await localClient
          .from("resources")
          .select("*, profiles(*)")
          .eq("visibility", "public")
          .execute();

        const filtered = allResources?.filter((r) => {
          const searchLower = searchQuery.toLowerCase();
          return (
            r.title.toLowerCase().includes(searchLower) ||
            r.description.toLowerCase().includes(searchLower) ||
            r.category.toLowerCase().includes(searchLower) ||
            r.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
          );
        }) || [];

        return filtered;
      }

      const { data, error } = await query.execute();
      if (error) throw error;
      return (data || []) as Array<{
        total: number;
        public: number;
      }>;
    },
    enabled: canAccessAdmin && !roleLoading && activeTab === "resources",
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      // Supprimer les relations
      const savedResResult = await (localClient.from("saved_resources").delete() as any).eq("resource_id", resourceId).execute();
      if (savedResResult.error) throw savedResResult.error;
      
      const ratingsResult = await (localClient.from("resource_ratings").delete() as any).eq("resource_id", resourceId).execute();
      if (ratingsResult.error) throw ratingsResult.error;
      
      const sharesResult = await (localClient.from("resource_shares").delete() as any).eq("resource_id", resourceId).execute();
      if (sharesResult.error) throw sharesResult.error;
      
      const commentsResult = await (localClient.from("resource_comments").delete() as any).eq("resource_id", resourceId).execute();
      if (commentsResult.error) throw commentsResult.error;
      
      // Supprimer la ressource
      const { error } = await (localClient
        .from("resources")
        .delete() as any)
        .eq("id", resourceId)
        .execute();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-public-resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({
        title: "Ressource supprimée",
        description: "La ressource publique a été supprimée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la ressource.",
        variant: "destructive",
      });
    },
  });

  // Fetch pending suggestions (always call hook, but conditionally enable)
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["admin-suggestions", activeTab],
    queryFn: async () => {
      // Pour l'onglet "resources", on ne récupère pas les suggestions
      if (activeTab === "resources") {
        return [];
      }

      // Récupérer TOUTES les suggestions (tous les statuts)
      const { data, error } = await localClient
        .from("category_tag_suggestions")
        .select("*")
        .eq("type", activeTab)
        .order("created_at", { ascending: false })
        .execute();

      if (error) {
        logger.error("Erreur lors de la récupération des suggestions", undefined, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }

      // Si aucune donnée, retourner un tableau vide
      if (!data || data.length === 0) {
        logger.debug(`Aucune suggestion trouvée pour le type: ${activeTab}`);
        return [];
      }

      logger.debug(`Récupération de ${data.length} suggestions pour le type: ${activeTab}`);

      // Fetch profiles separately for each suggestion
      const suggestionsWithProfiles = await Promise.all(
        (data || []).map(async (suggestion) => {
          // Récupérer les votes pour chaque suggestion
          const { data: votes } = await localClient
            .from("suggestion_votes")
            .select("user_id, vote_type")
            .eq("suggestion_id", suggestion.id)
            .execute();
          
          // Calculer les upvotes, downvotes et le score
          const upvotes = (votes || []).filter((v) => v.vote_type === "upvote").length;
          const downvotes = (votes || []).filter((v) => v.vote_type === "downvote").length;
          const score = upvotes - downvotes;
          
          // Trouver le vote de l'utilisateur actuel
          const userVote = user && votes
            ? votes.find((v) => v.user_id === user.id)
            : null;

          let profileData = null;
          if (suggestion.suggested_by) {
            try {
              const { data } = await localClient
                .from("profiles")
                .select("username, full_name")
                .eq("id", suggestion.suggested_by)
                .single();
              profileData = data;
            } catch (error) {
              // Profil non trouvé, on continue sans profil
              profileData = null;
            }
          }

          return {
            ...suggestion,
            profiles: profileData,
            user_votes: votes || [],
            user_vote_type: userVote?.vote_type || null,
            upvotes,
            downvotes,
            score,
          };
        })
      );

      // Trier : pending d'abord, puis approved, puis rejected, puis par votes_count
      const sorted = suggestionsWithProfiles.sort((a, b) => {
        const statusOrder = { pending: 0, approved: 1, rejected: 2 };
        const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
        if (statusDiff !== 0) return statusDiff;
        return (b.votes_count || 0) - (a.votes_count || 0);
      });

      return sorted as (Suggestion & { user_votes: any[] })[];
    },
    enabled: canAccessAdmin && !roleLoading && activeTab !== "resources",
  });

  // Filtrer les suggestions par statut
  const filteredSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    
    if (statusFilter === "all") {
      return suggestions;
    }
    
    return suggestions.filter((s) => s.status === statusFilter);
  }, [suggestions, statusFilter]);

  // Mutation pour éditer une suggestion
  const editSuggestionMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      const { error } = await (localClient
        .from("category_tag_suggestions")
        .update({ 
          name,
          description,
          updated_at: new Date().toISOString(),
        }) as any)
        .eq("id", id)
        .execute();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      setEditingSuggestion(null);
      toast({
        title: "Suggestion modifiée",
        description: "La suggestion a été mise à jour avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la suggestion.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer une suggestion
  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      // Supprimer d'abord les votes associés
      const votesResult = await (localClient
        .from("suggestion_votes")
        .delete() as any)
        .eq("suggestion_id", id)
        .execute();
      if (votesResult.error) throw votesResult.error;

      // Supprimer la suggestion
      const { error } = await (localClient
        .from("category_tag_suggestions")
        .delete() as any)
        .eq("id", id)
        .execute();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["top-suggestions"] });
      toast({
        title: "Suggestion supprimée",
        description: "La suggestion a été supprimée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la suggestion.",
        variant: "destructive",
      });
    },
  });

  // Update suggestion status mutation (always call hook)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "pending" }) => {
      const { error } = await (localClient
        .from("category_tag_suggestions")
        .update({ 
          status,
          reviewed_at: status !== "pending" ? new Date().toISOString() : null,
          reviewed_by: status !== "pending" && user ? user.id : null,
        }) as any)
        .eq("id", id)
        .execute();

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["top-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["filter-categories"] });
      queryClient.invalidateQueries({ queryKey: ["filter-tags"] });
      queryClient.invalidateQueries({ queryKey: ["filter-resource-types-approved"] });
      toast({
        title: variables.status === "approved" ? "Approuvé !" : "Rejeté",
        description: `La suggestion a été ${variables.status === "approved" ? "approuvée" : "rejetée"}.`,
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la suggestion.",
        variant: "destructive",
      });
    },
  });

  // Update category/tag name mutation
  const updateCategoryTagMutation = useMutation({
    mutationFn: async ({ 
      oldName, 
      newName, 
      type 
    }: { 
      oldName: string; 
      newName: string; 
      type: "category" | "tag" 
    }) => {
      // Update all resources that use this category/tag
      if (type === "category") {
        const { error } = await (localClient
          .from("resources")
          .update({ category: newName }) as any)
          .eq("category", oldName)
          .execute();
        
        if (error) throw error;
      } else {
        // For tags, we need to update the tags array
        const { data: resources } = await localClient
          .from("resources")
          .select("id, tags")
          .execute();
        
        if (resources) {
          const updates = resources
            .filter((r) => r.tags && r.tags.includes(oldName))
            .map(async (r) => {
              const updatedTags = r.tags.map((tag: string) => 
                tag === oldName ? newName : tag
              );
              const { error } = await (localClient
                .from("resources")
                .update({ tags: updatedTags }) as any)
                .eq("id", r.id)
                .execute();
              
              if (error) throw error;
            });
          
          await Promise.all(updates);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-existing-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-existing-tags"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setEditingItem(null);
      toast({
        title: "Modifié !",
        description: "Le nom a été mis à jour avec succès.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le nom.",
        variant: "destructive",
      });
    },
  });

  // Users management queries and mutations
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users", usersPage, usersSearch],
    queryFn: async () => {
      return await userManagementService.getUsers(usersPage, 20, usersSearch || undefined);
    },
    enabled: canAccessAdmin && !roleLoading && activeTab === "users",
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      await userManagementService.updateUserRole(userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été mis à jour avec succès.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le rôle.",
        variant: "destructive",
      });
    },
  });

  const { data: permissionEntries, isLoading: loadingPermissionEntries } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: adminPermissionsService.listPermissions,
    enabled: canAccessAdmin && !roleLoading,
  });

  const auditLogsEnabled = isSuperAdmin && activeTab === "audit";
  const { data: auditLogs, isLoading: loadingAuditLogs } = useQuery({
    queryKey: ["permission-audit", auditPage, auditActionFilter, auditRoleFilter, auditActorFilter],
    queryFn: () =>
      adminPermissionsService.listAuditLogs({
        page: auditPage,
        action: auditActionFilter === "all" ? undefined : (auditActionFilter as PermissionAuditAction),
        targetRole: auditRoleFilter === "all" ? undefined : auditRoleFilter,
        actorUserId: auditActorFilter || undefined,
      }),
    enabled: auditLogsEnabled,
  });

  const allRoles: AppRole[] = ["super_admin", "admin", "moderator", "user", "guest"];

  const permissionResources = useMemo(() => {
    if (!permissionEntries) return [];
    return Array.from(new Set(permissionEntries.map((permission) => permission.resource))).sort();
  }, [permissionEntries]);

  const filteredPermissions = useMemo(() => {
    if (!permissionEntries) return [];

    return permissionEntries.filter((permission) => {
      const search = permissionSearch.trim().toLowerCase();
      const matchesSearch =
        search.length === 0 ||
        permission.name.toLowerCase().includes(search) ||
        permission.resource.toLowerCase().includes(search) ||
        permission.action.toLowerCase().includes(search) ||
        (permission.description ?? "").toLowerCase().includes(search);

      const matchesResource =
        permissionResourceFilter === "all" || permission.resource === permissionResourceFilter;

      const matchesRole =
        permissionRoleFilter === "all" ||
        permission.roles.some((assignment) => assignment.role === permissionRoleFilter);

      return matchesSearch && matchesResource && matchesRole;
    });
  }, [permissionEntries, permissionSearch, permissionResourceFilter, permissionRoleFilter]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditActionFilter, auditRoleFilter, auditActorFilter]);

  const createPermissionMutation = useMutation({
    mutationFn: adminPermissionsService.createPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      setNewPermission({ resource: "", action: "", description: "" });
      toast({
        title: "Permission créée",
        description: "La permission a été ajoutée avec succès.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la permission.",
        variant: "destructive",
      });
    },
  });

  const assignPermissionMutation = useMutation({
    mutationFn: adminPermissionsService.assignPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      toast({
        title: "Permission assignée",
        description: "La permission a été assignée au rôle.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'assigner la permission.",
        variant: "destructive",
      });
    },
  });

  const revokePermissionMutation = useMutation({
    mutationFn: adminPermissionsService.revokePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      toast({
        title: "Permission retirée",
        description: "La permission a été retirée du rôle.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer la permission.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePermission = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPermission.resource.trim() || !newPermission.action.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez renseigner la ressource et l'action.",
        variant: "destructive",
      });
      return;
    }

    createPermissionMutation.mutate({
      resource: newPermission.resource.trim(),
      action: newPermission.action.trim(),
      description: newPermission.description.trim() || undefined,
    });
  };

  const handleAssignRole = (permissionId: string, role: AppRole) => {
    assignPermissionMutation.mutate(
      { role, permissionId },
      {
        onSettled: () =>
          setPermissionAssignSelections((prev) => ({ ...prev, [permissionId]: "" })),
      }
    );
  };

  const handleRevokeRole = (rolePermissionId: string) => {
    revokePermissionMutation.mutate(rolePermissionId);
  };

  const handleExportAudit = () => {
    if (!auditLogs?.data || auditLogs.data.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Il n'y a aucun événement à exporter pour le moment.",
      });
      return;
    }

    const rows = auditLogs.data.map((log) => ({
      date: new Date(log.createdAt).toISOString(),
      action: log.action,
      permission: log.permissionName || log.permission?.name || "",
      resource: log.permission?.resource || "",
      targetRole: log.targetRole || "",
      actor: log.actor?.username || log.actor?.email || "Système",
    }));

    const headers = ["date", "action", "permission", "resource", "targetRole", "actor"];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header as keyof typeof row] ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `permission-audit-${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Delete category/tag mutation
  const deleteCategoryTagMutation = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: "category" | "tag" }) => {
      if (type === "category") {
        // Cannot delete category if resources use it
        const { data: resources } = await localClient
          .from("resources")
          .select("id")
          .eq("category", name)
          .limit(1)
          .execute();
        
        if (resources && resources.length > 0) {
          throw new Error("Impossible de supprimer une catégorie utilisée par des ressources. Modifiez d'abord les ressources.");
        }
      } else {
        // For tags, check if any resource uses it
        const { data: resources } = await localClient
          .from("resources")
          .select("id, tags")
          .execute();
        
        const hasResources = resources?.some((r) => 
          r.tags && r.tags.includes(name)
        );
        
        if (hasResources) {
          throw new Error("Impossible de supprimer un tag utilisé par des ressources. Modifiez d'abord les ressources.");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-existing-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-existing-tags"] });
      toast({
        title: "Supprimé !",
        description: "L'élément a été supprimé avec succès.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'élément.",
        variant: "destructive",
      });
    },
  });

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!canAccessAdmin) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16 space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-sm mb-4">
              <Shield className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">Panneau Administrateur</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Gestion des <span className="bg-gradient-primary bg-clip-text text-transparent">Suggestions</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Approuvez ou rejetez les suggestions de catégories et tags de la communauté
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className="space-y-8">
            <TabsList className="grid w-full sm:w-auto grid-cols-9 gap-2">
              <TabsTrigger value="category" className="gap-2">
                <FolderTree className="h-4 w-4" />
                Catégories
                {suggestions && suggestions.length > 0 && (
                  <Badge variant="secondary">{suggestions.filter((s) => s.status === "pending").length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tag" className="gap-2">
                <Tag className="h-4 w-4" />
                Tags
                {suggestions && suggestions.length > 0 && (
                  <Badge variant="secondary">{suggestions.filter((s) => s.status === "pending").length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resource_type" className="gap-2">
                <FileText className="h-4 w-4" />
                Types
                {suggestions && suggestions.length > 0 && (
                  <Badge variant="secondary">{suggestions.filter((s) => s.status === "pending").length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="filter" className="gap-2">
                <Tag className="h-4 w-4" />
                Filtres
                {suggestions && suggestions.length > 0 && (
                  <Badge variant="secondary">{suggestions.filter((s) => s.status === "pending").length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-2">
                <Globe className="h-4 w-4" />
                Ressources
                {publicResources && publicResources.length > 0 && (
                  <Badge variant="secondary">{publicResources.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Utilisateurs
              </TabsTrigger>
              {canAccessAdmin && (
                <TabsTrigger value="permissions" className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Permissions
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="audit" className="gap-2">
                  <History className="h-4 w-4" />
                  Audit
                </TabsTrigger>
              )}
              <TabsTrigger value="config" className="gap-2">
                <Settings className="h-4 w-4" />
                Config
              </TabsTrigger>
            </TabsList>

            {/* Suggestions Tab */}
            {(activeTab === "category" || activeTab === "tag" || activeTab === "resource_type" || activeTab === "filter") && (
              <TabsContent value={activeTab} className="space-y-6">
                {/* Existing Categories/Tags/Resource Types Section */}
                {(activeTab === "category" || activeTab === "tag" || activeTab === "resource_type") && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {activeTab === "category" ? "Catégories existantes" : activeTab === "tag" ? "Tags existants" : "Types de ressources existants"}
                      </h2>
                      <p className="text-muted-foreground">
                        Liste de toutes les {activeTab === "category" ? "catégories" : activeTab === "tag" ? "tags" : "types de ressources"} utilisées dans les ressources
                      </p>
                    </div>
                  
                  {activeTab === "category" && (
                    loadingCategories ? (
                      <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                    ) : existingCategories && existingCategories.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {existingCategories.map((cat) => (
                          <Card key={cat.name} className="p-4 relative group">
                            <div className="space-y-2">
                              {editingItem?.type === "category" && editingItem.name === cat.name ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editingItem.newName}
                                    onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })}
                                    className="h-8 text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2"
                                      onClick={() => {
                                        updateCategoryTagMutation.mutate({
                                          oldName: cat.name,
                                          newName: editingItem.newName,
                                          type: "category",
                                        });
                                      }}
                                      disabled={updateCategoryTagMutation.isPending}
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2"
                                      onClick={() => setEditingItem(null)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h3 className="font-semibold pr-8">{cat.name}</h3>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="secondary">{cat.total} total</Badge>
                                    <Badge variant="outline">{cat.public} public{cat.public > 1 ? 's' : ''}</Badge>
                                  </div>
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setEditingItem({ type: "category", name: cat.name, newName: cat.name })}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${cat.name}" ?`)) {
                                          deleteCategoryTagMutation.mutate({ name: cat.name, type: "category" });
                                        }
                                      }}
                                      disabled={deleteCategoryTagMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucune catégorie trouvée
                      </div>
                    )
                  )}

                  {activeTab === "tag" && (
                    loadingTags ? (
                      <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                    ) : existingTags && existingTags.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {existingTags.map((tag) => (
                          <Card key={tag.name} className="p-4 relative group">
                            <div className="space-y-2">
                              {editingItem?.type === "tag" && editingItem.name === tag.name ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editingItem.newName}
                                    onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })}
                                    className="h-8 text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2"
                                      onClick={() => {
                                        updateCategoryTagMutation.mutate({
                                          oldName: tag.name,
                                          newName: editingItem.newName,
                                          type: "tag",
                                        });
                                      }}
                                      disabled={updateCategoryTagMutation.isPending}
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2"
                                      onClick={() => setEditingItem(null)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h3 className="font-semibold pr-8">#{tag.name}</h3>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="secondary">{tag.total} total</Badge>
                                    <Badge variant="outline">{tag.public} public{tag.public > 1 ? 's' : ''}</Badge>
                                  </div>
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setEditingItem({ type: "tag", name: tag.name, newName: tag.name })}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (confirm(`Êtes-vous sûr de vouloir supprimer le tag "${tag.name}" ?`)) {
                                          deleteCategoryTagMutation.mutate({ name: tag.name, type: "tag" });
                                        }
                                      }}
                                      disabled={deleteCategoryTagMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucun tag trouvé
                      </div>
                    )
                  )}

                  {activeTab === "resource_type" && (
                    loadingResourceTypes ? (
                      <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                    ) : existingResourceTypes && existingResourceTypes.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {existingResourceTypes.map((type) => (
                          <Card key={type.name} className="p-4 relative group">
                            <div className="space-y-2">
                              <h3 className="font-semibold pr-8 capitalize">{type.name.replace("_", " ")}</h3>
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary">{type.total} total</Badge>
                                <Badge variant="outline">{type.public} public{type.public > 1 ? 's' : ''}</Badge>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucun type de ressource trouvé
                      </div>
                    )
                  )}
                  </div>
                )}

                {/* Separator */}
                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Suggestions {activeTab === "category" ? "de catégories" : activeTab === "tag" ? "de tags" : activeTab === "resource_type" ? "de types" : "de filtres"}
                    </span>
                  </div>
                </div>

                {/* Filtre par statut */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Filtrer par statut:</span>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SuggestionStatus | "all")}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="approved">Approuvées</SelectItem>
                        <SelectItem value="rejected">Rejetées</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="secondary">
                    {filteredSuggestions.length} suggestion{filteredSuggestions.length > 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Suggestions Section */}
                {isLoading && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                )}

                {!isLoading && filteredSuggestions.length === 0 && (
                  <div className="text-center py-12 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">
                        {statusFilter === "all" ? "Aucune suggestion" : `Aucune suggestion ${statusFilter === "pending" ? "en attente" : statusFilter === "approved" ? "approuvée" : "rejetée"}`}
                      </h3>
                      <p className="text-muted-foreground">
                        {statusFilter === "all" ? "Aucune suggestion trouvée pour le moment." : "Modifiez le filtre pour voir d'autres suggestions."}
                      </p>
                    </div>
                  </div>
                )}

                {filteredSuggestions && filteredSuggestions.length > 0 && (
                  <div className="grid gap-6">
                    {filteredSuggestions.map((suggestion) => {
                      // Badge de statut
                      const getStatusBadge = (status: SuggestionStatus) => {
                        switch (status) {
                          case "approved":
                            return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approuvé</Badge>;
                          case "rejected":
                            return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
                          default:
                            return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
                        }
                      };

                      const isEditing = editingSuggestion?.id === suggestion.id;

                      return (
                        <Card key={suggestion.id} className="p-6">
                          <div className="space-y-4">
                            {isEditing ? (
                              // Mode édition
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Nom</label>
                                  <Input
                                    value={editingSuggestion.name}
                                    onChange={(e) => setEditingSuggestion({ ...editingSuggestion, name: e.target.value })}
                                    placeholder="Nom de la suggestion"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Description</label>
                                  <Textarea
                                    value={editingSuggestion.description}
                                    onChange={(e) => setEditingSuggestion({ ...editingSuggestion, description: e.target.value })}
                                    placeholder="Description de la suggestion"
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      editSuggestionMutation.mutate({
                                        id: suggestion.id,
                                        name: editingSuggestion.name,
                                        description: editingSuggestion.description,
                                      });
                                    }}
                                    disabled={editSuggestionMutation.isPending || !editingSuggestion.name.trim()}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Enregistrer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingSuggestion(null)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // Mode affichage
                              <>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <h3 className="text-2xl font-bold">{suggestion.name}</h3>
                                      {getStatusBadge(suggestion.status)}
                                      <Badge variant="outline" className="gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        {(suggestion as any).score !== undefined ? (suggestion as any).score : suggestion.votes_count} votes
                                        {(suggestion as any).upvotes !== undefined && (
                                          <span className="ml-1">({(suggestion as any).upvotes} ↑ / {(suggestion as any).downvotes} ↓)</span>
                                        )}
                                      </Badge>
                                    </div>
                                    {suggestion.description && (
                                      <p className="text-muted-foreground text-lg">{suggestion.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                      <span>
                                        Suggéré par: {suggestion.profiles?.full_name || suggestion.profiles?.username || "Utilisateur"}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {new Date(suggestion.created_at).toLocaleDateString("fr-FR", {
                                          day: "numeric",
                                          month: "long",
                                          year: "numeric",
                                        })}
                                      </span>
                                      {suggestion.reviewed_at && (
                                        <>
                                          <span>•</span>
                                          <span>
                                            {suggestion.status === "approved" ? "Approuvé" : "Rejeté"} le{" "}
                                            {new Date(suggestion.reviewed_at).toLocaleDateString("fr-FR")}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t items-center justify-between flex-wrap">
                                  <div className="flex gap-3 flex-wrap">
                                    {/* Boutons d'action selon le statut */}
                                    {suggestion.status !== "approved" && (
                                      <Button
                                        variant="default"
                                        className="gap-2 bg-green-500 hover:bg-green-600"
                                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "approved" })}
                                        disabled={updateStatusMutation.isPending}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                        {suggestion.status === "rejected" ? "Réapprouver" : "Approuver"}
                                      </Button>
                                    )}
                                    {suggestion.status !== "rejected" && (
                                      <Button
                                        variant="destructive"
                                        className="gap-2"
                                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "rejected" })}
                                        disabled={updateStatusMutation.isPending}
                                      >
                                        <XCircle className="h-4 w-4" />
                                        Rejeter
                                      </Button>
                                    )}
                                    {suggestion.status === "approved" && (
                                      <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "pending" })}
                                        disabled={updateStatusMutation.isPending}
                                      >
                                        <Clock className="h-4 w-4" />
                                        Remettre en attente
                                      </Button>
                                    )}
                                    {/* Bouton d'édition */}
                                    <Button
                                      variant="outline"
                                      className="gap-2"
                                      onClick={() => setEditingSuggestion({
                                        id: suggestion.id,
                                        name: suggestion.name,
                                        description: suggestion.description || "",
                                      })}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      Éditer
                                    </Button>
                                    {/* Bouton de suppression */}
                                    <Button
                                      variant="outline"
                                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        if (confirm(`Êtes-vous sûr de vouloir supprimer la suggestion "${suggestion.name}" ? Cette action est irréversible.`)) {
                                          deleteSuggestionMutation.mutate(suggestion.id);
                                        }
                                      }}
                                      disabled={deleteSuggestionMutation.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Supprimer
                                    </Button>
                                  </div>
                                  {/* Boutons de vote pour l'admin */}
                                  {user && (
                                    <VoteButtons
                                      suggestionId={suggestion.id}
                                      currentVoteType={(suggestion as any).user_vote_type || null}
                                      upvotes={(suggestion as any).upvotes || 0}
                                      downvotes={(suggestion as any).downvotes || 0}
                                      score={(suggestion as any).score !== undefined ? (suggestion as any).score : suggestion.votes_count}
                                      size="sm"
                                      showCounts={true}
                                    />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Gestion des utilisateurs</h2>
                <p className="text-muted-foreground">
                  Gérez les rôles et les permissions des utilisateurs
                </p>
              </div>

              {/* Search */}
              <div className="flex gap-4">
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  className="max-w-sm"
                />
              </div>

              {/* Users List */}
              {loadingUsers ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : usersData && usersData.data.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {usersData.data.map((user: User) => (
                      <Card key={user.userId} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback>
                                {user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">
                                  {user.fullName || user.username || user.email}
                                </h3>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {user.role}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                <span>{user.resourcesCount} ressources</span>
                                <span>{user.collectionsCount} collections</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.role}
                              onValueChange={(value: 'admin' | 'user') => {
                                updateUserRoleMutation.mutate({
                                  userId: user.userId,
                                  role: value,
                                });
                              }}
                              disabled={updateUserRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Utilisateur</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {usersData.meta.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {usersData.meta.page} sur {usersData.meta.totalPages} ({usersData.meta.total} utilisateurs)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                          disabled={usersPage === 1}
                        >
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage((p) => Math.min(usersData.meta.totalPages, p + 1))}
                          disabled={usersPage === usersData.meta.totalPages}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Aucun utilisateur trouvé</h3>
                    <p className="text-muted-foreground">
                      {usersSearch ? "Aucun utilisateur ne correspond à votre recherche." : "Aucun utilisateur dans le système."}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Permissions Tab */}
            {canAccessAdmin && (
              <TabsContent value="permissions" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Permissions granulaires</h2>
                  <p className="text-muted-foreground">
                    Créez de nouvelles permissions et assignez-les aux rôles pour contrôler précisément l’accès aux
                    fonctionnalités.
                  </p>
                </div>

                {isSuperAdmin && (
                  <Card className="p-6">
                    <form className="grid gap-4 md:grid-cols-4" onSubmit={handleCreatePermission}>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Ressource</p>
                        <Input
                          placeholder="resource"
                          value={newPermission.resource}
                          onChange={(e) => setNewPermission((prev) => ({ ...prev, resource: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Action</p>
                        <Input
                          placeholder="create / read / update..."
                          value={newPermission.action}
                          onChange={(e) => setNewPermission((prev) => ({ ...prev, action: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <p className="text-sm font-medium">Description</p>
                        <Input
                          placeholder="Optionnel"
                          value={newPermission.description}
                          onChange={(e) =>
                            setNewPermission((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" className="w-full" disabled={createPermissionMutation.isPending}>
                          {createPermissionMutation.isPending ? "Création..." : "Créer la permission"}
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                <Card className="p-6 space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <Input
                      placeholder="Rechercher une permission..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="max-w-md"
                    />
                    <div className="flex flex-col gap-3 md:flex-row">
                      <Select value={permissionResourceFilter} onValueChange={setPermissionResourceFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Ressource" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les ressources</SelectItem>
                          {permissionResources.map((resource) => (
                            <SelectItem key={resource} value={resource}>
                              {resource}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={permissionRoleFilter}
                        onValueChange={(value) =>
                          setPermissionRoleFilter(value as AppRole | "all")
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les rôles</SelectItem>
                          {allRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>

                {loadingPermissionEntries ? (
                  <div className="text-center py-12 text-muted-foreground">Chargement des permissions...</div>
                ) : filteredPermissions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPermissions.map((permission) => {
                      const availableRoles = allRoles.filter(
                        (role) => !permission.roles.some((assignment) => assignment.role === role)
                      );

                      return (
                        <Card key={permission.id} className="p-6 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold">{permission.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {permission.description || "Aucune description fournie"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{permission.resource}</Badge>
                              <Badge variant="secondary" className="uppercase">
                                {permission.action}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Rôles ayant cette permission</p>
                            <div className="flex flex-wrap gap-2">
                              {permission.roles.length > 0 ? (
                                permission.roles.map((assignment) => (
                                  <Badge key={assignment.rolePermissionId} variant="secondary" className="flex items-center gap-1">
                                    {assignment.role}
                                    {isSuperAdmin && (
                                      <button
                                        type="button"
                                        className="ml-1 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRevokeRole(assignment.rolePermissionId)}
                                        disabled={revokePermissionMutation.isPending}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">Aucun rôle assigné</span>
                              )}
                            </div>
                          </div>
                          {isSuperAdmin && availableRoles.length > 0 && (
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <Select
                                value={permissionAssignSelections[permission.id] ?? ""}
                                onValueChange={(value) => {
                                  if (!value) return;
                                  setPermissionAssignSelections((prev) => ({ ...prev, [permission.id]: value as AppRole }));
                                  handleAssignRole(permission.id, value as AppRole);
                                }}
                                disabled={assignPermissionMutation.isPending}
                              >
                                <SelectTrigger className="w-full md:w-64">
                                  <SelectValue placeholder="Assigner à un rôle" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="" disabled>
                                    Sélectionner un rôle
                                  </SelectItem>
                                  {availableRoles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Choisissez un rôle pour lui accorder cette permission.
                              </p>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-2">
                    <History className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Aucune permission ne correspond à vos filtres.</p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Audit Tab */}
            {isSuperAdmin && (
              <TabsContent value="audit" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Journal des permissions</h2>
                  <p className="text-muted-foreground">
                    Analysez toutes les modifications réalisées sur les rôles et permissions.
                  </p>
                </div>

                <Card className="p-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Select
                      value={auditActionFilter}
                      onValueChange={(value) => setAuditActionFilter(value as PermissionAuditAction | "all")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les actions</SelectItem>
                        <SelectItem value="PERMISSION_CREATED">Création</SelectItem>
                        <SelectItem value="PERMISSION_ASSIGNED">Assignation</SelectItem>
                        <SelectItem value="PERMISSION_REVOKED">Révocation</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={auditRoleFilter}
                      onValueChange={(value) => setAuditRoleFilter(value as AppRole | "all")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Rôle cible" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les rôles</SelectItem>
                        {allRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="ID utilisateur (acteur)"
                      value={auditActorFilter}
                      onChange={(e) => setAuditActorFilter(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={handleExportAudit}
                      disabled={loadingAuditLogs}
                    >
                      <Download className="h-4 w-4" />
                      Exporter CSV
                    </Button>
                  </div>
                </Card>

                {loadingAuditLogs ? (
                  <div className="text-center py-12 text-muted-foreground">Chargement du journal...</div>
                ) : auditLogs && auditLogs.data.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">Action</th>
                            <th className="px-4 py-3 text-left font-medium">Permission</th>
                            <th className="px-4 py-3 text-left font-medium">Rôle cible</th>
                            <th className="px-4 py-3 text-left font-medium">Acteur</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.data.map((log) => (
                            <tr key={log.id} className="border-t">
                              <td className="px-4 py-3">
                                {new Date(log.createdAt).toLocaleString("fr-FR")}
                              </td>
                              <td className="px-4 py-3">{log.action}</td>
                              <td className="px-4 py-3">
                                {log.permissionName || log.permission?.name || "—"}
                              </td>
                              <td className="px-4 py-3">{log.targetRole || "—"}</td>
                              <td className="px-4 py-3">
                                {log.actor?.username || log.actor?.email || "Système"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {auditLogs.meta.totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Page {auditLogs.meta.page} sur {auditLogs.meta.totalPages} ({auditLogs.meta.total} événements)
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                            disabled={auditPage === 1}
                          >
                            Précédent
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAuditPage((page) =>
                                Math.min(auditLogs.meta.totalPages, page + 1)
                              )
                            }
                            disabled={auditPage === auditLogs.meta.totalPages}
                          >
                            Suivant
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-2">
                    <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Aucune activité récente.</p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-6">
              <AdminConfigPanel />
            </TabsContent>

            {/* Public Resources Tab */}
            <TabsContent value="resources" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Ressources publiques</h2>
                  <p className="text-muted-foreground">
                    Gérez les ressources partagées publiquement sur la plateforme
                  </p>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                  <Input
                    placeholder="Rechercher une ressource..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>

                {loadingResources ? (
                  <div className="text-center py-12 text-muted-foreground">Chargement...</div>
                ) : publicResources && publicResources.length > 0 ? (
                  <div className="grid gap-4">
                    {publicResources.map((resource) => (
                      <Card key={resource.id} className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold">{resource.title}</h3>
                              <Badge variant="outline">{resource.category}</Badge>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{resource.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                Par: {resource.profiles?.full_name || resource.profiles?.username || "Utilisateur"}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(resource.created_at).toLocaleDateString("fr-FR")}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {resource.views_count || 0} vues
                              </span>
                            </div>
                            {resource.tags && resource.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {resource.tags.slice(0, 5).map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/resource/${resource.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Voir
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Êtes-vous sûr de vouloir supprimer la ressource "${resource.title}" ?`)) {
                                  deleteResourceMutation.mutate(resource.id);
                                }
                              }}
                              disabled={deleteResourceMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                      <Globe className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Aucune ressource publique</h3>
                      <p className="text-muted-foreground">
                        Aucune ressource n'est actuellement partagée publiquement.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
