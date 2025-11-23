import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Upload, User, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PageLoader } from "@/components/LoadingStates";
import { FileUpload, UploadedFile } from "@/components/FileUpload";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    bio: "",
    github_username: "",
    avatar_url: "",
    avatarFile: null as UploadedFile | null,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await localClient
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setFormData({
          username: data.username || "",
          full_name: data.full_name || "",
          bio: data.bio || "",
          github_username: data.github_username || "",
          avatar_url: data.avatar_url || "",
          avatarFile: null,
        });
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: "Impossible de charger le profil",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updateData: any = {
        username: formData.username.trim(),
        full_name: formData.full_name.trim() || null,
        bio: formData.bio.trim() || null,
        github_username: formData.github_username.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Si un nouveau fichier avatar est uploadé
      if (formData.avatarFile) {
        const fileKey = `hub-lib-avatar-${user!.id}-${Date.now()}`;
        localStorage.setItem(fileKey, JSON.stringify({
          name: formData.avatarFile.name,
          type: formData.avatarFile.type,
          size: formData.avatarFile.size,
          data: formData.avatarFile.data,
        }));

        updateData.avatar_url = `data:${formData.avatarFile.type};base64,${formData.avatarFile.data}`;
      }

      const { error } = await localClient
        .from("profiles")
        .update(updateData)
        .eq("id", user!.id);

      if (error) throw error;

      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ["profile", user!.id] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });

      toast({
        title: "Profil mis à jour",
        description: "Votre profil a été modifié avec succès",
      });

      navigate(`/profile/${formData.username || user!.id}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-12">
          <div className="container mx-auto px-4">
            <PageLoader message="Chargement..." />
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
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate(`/profile/${formData.username || user?.id}`)}
                className="mb-4 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au profil
              </Button>
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Modifier mon <span className="text-primary">Profil</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Mettez à jour vos informations personnelles
              </p>
            </div>

            <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar */}
                <div className="space-y-4">
                  <Label>Photo de profil</Label>
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage 
                        src={formData.avatarFile ? `data:${formData.avatarFile.type};base64,${formData.avatarFile.data}` : formData.avatar_url || undefined} 
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {(formData.username || formData.full_name || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <FileUpload
                        onFileSelect={(file) => {
                          setFormData({ ...formData, avatarFile: file });
                        }}
                        value={formData.avatarFile}
                        disabled={isSubmitting}
                        maxSize={2}
                        acceptedTypes={["image/*"]}
                      />
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">
                    Nom d'utilisateur <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="nom_utilisateur"
                      className="pl-10"
                      required
                      minLength={3}
                      maxLength={30}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    3-30 caractères, lettres, chiffres et underscores uniquement
                  </p>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Jean Dupont"
                    maxLength={100}
                  />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    L'email ne peut pas être modifié
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Biographie</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder="Parlez-nous de vous..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.bio.length}/500 caractères
                  </p>
                </div>

                {/* GitHub Username */}
                <div className="space-y-2">
                  <Label htmlFor="github_username">Nom d'utilisateur GitHub</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      github.com/
                    </span>
                    <Input
                      id="github_username"
                      value={formData.github_username}
                      onChange={(e) =>
                        setFormData({ ...formData, github_username: e.target.value })
                      }
                      placeholder="username"
                      className="pl-24"
                      maxLength={39}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Mise à jour..." : "Mettre à jour le profil"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/profile/${formData.username || user?.id}`)}
                    disabled={isSubmitting}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EditProfile;

