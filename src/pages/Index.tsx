import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { HomeRecommendations } from "@/components/HomeRecommendations";
import { TopSuggestionsSection } from "@/components/TopSuggestionsSection";
import { Categories } from "@/components/Categories";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <HomeRecommendations />
      <TopSuggestionsSection />
      {!user && (
        <>
          <HowItWorks />
          <Features />
        </>
      )}
      <Categories />
      {!user && <CTA />}
      <Footer />
    </div>
  );
};

export default Index;
