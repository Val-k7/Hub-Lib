import { useAuth } from "@/hooks/useAuth";
import { HomeGuest } from "./HomeGuest";
import { HomeUser } from "./HomeUser";

const Index = () => {
  const { user, loading } = useAuth();

  // Afficher un loader pendant la vérification de l'authentification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  // Afficher la page appropriée selon le statut de l'utilisateur
  return user ? <HomeUser /> : <HomeGuest />;
};

export default Index;
