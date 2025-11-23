import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Grid, List } from "lucide-react";
import { useResources } from "@/hooks/useResources";
import { ResourceGridSkeleton } from "@/components/LoadingStates";
import { NoSearchResults, NoResources } from "@/components/EmptyStates";
import { VirtualResourceList } from "@/components/VirtualResourceList";
import { ResourceCard } from "@/components/ResourceCard";
import { Badge } from "@/components/ui/badge";
import { BrowseStats } from "@/components/BrowseStats";

const Browse = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [authorFilter, setAuthorFilter] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: allResources = [], isLoading } = useResources({
    searchQuery,
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // Client-side filters for visibility, resource types, rating, author, license, language, and date
  const resources = allResources.filter(resource => {
    // Visibility filter
    if (selectedVisibility.length > 0 && !selectedVisibility.includes(resource.visibility || 'public')) {
      return false;
    }
    
    // Resource type filter
    if (selectedResourceTypes.length > 0 && !selectedResourceTypes.includes(resource.resource_type)) {
      return false;
    }
    
    // Rating filter
    if (minRating > 0 && resource.average_rating < minRating) {
      return false;
    }

    // Author filter
    if (authorFilter) {
      const authorName = (resource.profiles?.username || resource.profiles?.full_name || "").toLowerCase();
      if (!authorName.includes(authorFilter.toLowerCase())) {
        return false;
      }
    }

    // License filter
    if (licenseFilter && resource.license !== licenseFilter) {
      return false;
    }

    // Language filter
    if (languageFilter && resource.language?.toLowerCase() !== languageFilter.toLowerCase()) {
      return false;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const resourceDate = new Date(resource.created_at);
      if (dateFrom && resourceDate < new Date(dateFrom)) {
        return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Fin de journée
        if (resourceDate > toDate) {
          return false;
        }
      }
    }
    
    return true;
  });

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleResourceTypeToggle = (type: string) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleMinRatingChange = (rating: number) => {
    setMinRating(rating);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedVisibility([]);
    setSelectedResourceTypes([]);
    setMinRating(0);
    setAuthorFilter("");
    setLicenseFilter("");
    setLanguageFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleVisibilityToggle = (visibility: string) => {
    setSelectedVisibility((prev) =>
      prev.includes(visibility) ? prev.filter((v) => v !== visibility) : [...prev, visibility]
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section with improved styling */}
      <section className="pt-32 pb-12 bg-gradient-hero border-b border-border/50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Explorer la <span className="bg-gradient-primary bg-clip-text text-transparent">Bibliothèque</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Découvrez {resources.length}+ ressources partagées par la communauté
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher par titre, description, tags..."
              />
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 md:hidden hover-scale"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with improved layout */}
      <main className="flex-1 py-12 bg-gradient-subtle relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.05),transparent_50%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            {/* Filters Sidebar with animation */}
            <aside className={`${showFilters ? "block animate-fade-in" : "hidden"} lg:block`}>
              <FilterPanel
                selectedCategories={selectedCategories}
                selectedTags={selectedTags}
                selectedVisibility={selectedVisibility}
                selectedResourceTypes={selectedResourceTypes}
                minRating={minRating}
                authorFilter={authorFilter}
                licenseFilter={licenseFilter}
                languageFilter={languageFilter}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onCategoryToggle={handleCategoryToggle}
                onTagToggle={handleTagToggle}
                onVisibilityToggle={handleVisibilityToggle}
                onResourceTypeToggle={handleResourceTypeToggle}
                onMinRatingChange={handleMinRatingChange}
                onAuthorChange={setAuthorFilter}
                onLicenseChange={setLicenseFilter}
                onLanguageChange={setLanguageFilter}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
            </aside>

            {/* Resources Grid */}
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {/* Statistics */}
              {!isLoading && resources.length > 0 && <BrowseStats resources={resources} />}
              
              {/* Results Header with better styling */}
              <div className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50">
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium">
                    {resources.length} ressource{resources.length > 1 ? "s" : ""} trouvée{resources.length > 1 ? "s" : ""}
                  </p>
                  {resources.length > 20 && (
                    <div className="flex gap-2">
                      <Badge 
                        variant={viewMode === "grid" ? "default" : "outline"}
                        className="cursor-pointer hover-scale"
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid className="h-3 w-3 mr-1" />
                        Grille
                      </Badge>
                      <Badge 
                        variant={viewMode === "list" ? "default" : "outline"}
                        className="cursor-pointer hover-scale"
                        onClick={() => setViewMode("list")}
                      >
                        <List className="h-3 w-3 mr-1" />
                        Liste virtuelle
                      </Badge>
                    </div>
                  )}
                </div>
                {(selectedCategories.length > 0 || selectedTags.length > 0 || selectedVisibility.length > 0 || selectedResourceTypes.length > 0 || minRating > 0 || authorFilter || licenseFilter || languageFilter || dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="hover-scale"
                  >
                    Réinitialiser filtres
                  </Button>
                )}
              </div>

              {/* Resources List with staggered animation */}
              {isLoading ? (
                <ResourceGridSkeleton count={6} />
              ) : resources.length === 0 ? (
                searchQuery || selectedCategories.length > 0 || selectedTags.length > 0 || selectedVisibility.length > 0 || authorFilter || licenseFilter || languageFilter || dateFrom || dateTo ? (
                  <NoSearchResults searchQuery={searchQuery || "vos filtres"} />
                ) : (
                  <NoResources />
                )
              ) : resources.length > 20 && viewMode === "list" ? (
                <VirtualResourceList resources={resources} />
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {resources.map((resource, index) => (
                    <div
                      key={resource.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${Math.min(index * 0.05, 1)}s` }}
                    >
                      <ResourceCard
                        id={resource.id}
                        title={resource.title}
                        description={resource.description}
                        author={resource.profiles.username || resource.profiles.full_name || "Anonyme"}
                        authorUsername={resource.profiles.username || undefined}
                        category={resource.category}
                        tags={resource.tags}
                        resourceType={resource.resource_type}
                        averageRating={resource.average_rating}
                        ratingsCount={resource.ratings_count}
                        downloads={resource.downloads_count}
                        views={resource.views_count}
                        lastUpdated={new Date(resource.updated_at).toLocaleDateString("fr-FR")}
                        visibility={resource.visibility as any}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Browse;
