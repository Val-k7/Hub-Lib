import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export const HomeGuest = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <HowItWorks />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
};

