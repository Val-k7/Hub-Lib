import { Github, Twitter, Mail, Heart, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border/50 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary group-hover:scale-110 transition-transform" />
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                HubLib
              </span>
            </Link>
            <p className="text-muted-foreground leading-relaxed">
              La plateforme communautaire pour partager et découvrir vos ressources GitHub.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary hover-scale"
                asChild
              >
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <Github className="h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary hover-scale"
                asChild
              >
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary hover-scale"
                asChild
              >
                <a href="mailto:contact@hublib.dev" aria-label="Email">
                  <Mail className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Produit</h3>
            <nav className="flex flex-col gap-3">
              <Link
                to="/browse"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Explorer
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/#features"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Fonctionnalités
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/#categories"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Catégories
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </nav>
          </div>

          {/* Resources Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Ressources</h3>
            <nav className="flex flex-col gap-3">
              <a
                href="https://docs.github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Documentation
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Guide de démarrage
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                API
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </nav>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Légal</h3>
            <nav className="flex flex-col gap-3">
              <Link
                to="/privacy"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Confidentialité
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/terms"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Conditions
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                License
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} HubLib. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Fait avec</span>
            <Heart className="h-4 w-4 text-red-500 animate-pulse" fill="currentColor" />
            <span>pour la communauté Open Source</span>
          </div>
        </div>
      </div>

      {/* Decorative gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </footer>
  );
};
