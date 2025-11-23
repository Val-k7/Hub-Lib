import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Github, Mail } from "lucide-react";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";

const Auth = () => {
  const { user, signInWithGitHub, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = isSignUp 
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);

    if (error) {
      toast.error(error.message);
    } else {
      if (isSignUp) {
        toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
      } else {
        toast.success("Connexion réussie !");
        // Si c'est un utilisateur legacy qui vient de se connecter, afficher un message
        const { isLegacyUser } = await import('@/lib/migration');
        if (isLegacyUser(email)) {
          toast.info("Votre compte a été migré. Vous pouvez maintenant utiliser votre mot de passe normalement.");
        }
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
    }
  };

  const handleGitHubSignIn = async () => {
    const { error } = await signInWithGitHub();
    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isSignUp ? "Créer un compte" : "Se connecter"}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp 
              ? "Créez votre compte pour commencer à partager" 
              : "Connectez-vous pour accéder à vos ressources"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Mail className="mr-2 h-4 w-4" />
              {isSignUp ? "Créer mon compte" : "Se connecter"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continuer avec
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Button onClick={handleGoogleSignIn} variant="outline" className="w-full">
              <FcGoogle className="mr-2 h-5 w-5" />
              Google
            </Button>
            <Button onClick={handleGitHubSignIn} variant="outline" className="w-full">
              <Github className="mr-2 h-5 w-5" />
              GitHub
            </Button>
          </div>

          <div className="text-center text-sm">
            {isSignUp ? (
              <>
                Déjà un compte ?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => setIsSignUp(false)}
                >
                  Se connecter
                </Button>
              </>
            ) : (
              <>
                Pas encore de compte ?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => setIsSignUp(true)}
                >
                  Créer un compte
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
