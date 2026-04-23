import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { MetricsSection } from "@/components/landing/MetricsSection";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  const navigate = useNavigate();

  // Apply dark mode for landing page
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      const saved = localStorage.getItem("pilot-theme");
      if (saved !== "dark") {
        document.documentElement.classList.remove("dark");
      }
    };
  }, []);

  const handleCTA = () => {
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection onCTA={handleCTA} />
      <MetricsSection />
      <ProductDemo />
      <Footer />
    </div>
  );
};

export default Index;
