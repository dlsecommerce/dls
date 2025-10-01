// app/page.tsx (Server Component por padrão)

import Header from "@/components/inicio/Header";
import HeroSection from "@/components/inicio/HeroSection";
import Footer from "@/components/inicio/Footer";

import dynamic from "next/dynamic";
import { LoadingBar } from "@/components/ui/loading-bar";

// Carrega essas seções só quando o usuário chegar nelas
const HowItWorksSection = dynamic(() => import("@/components/inicio/HowItWorksSection"), {
  loading: () => <LoadingBar />, 
});

const FeaturesSection = dynamic(() => import("@/components/inicio/FeaturesSection"), {
  loading: () => <LoadingBar />,
});

const TeamSection = dynamic(() => import("@/components/inicio/TeamSection"), {
  loading: () => <LoadingBar />,
});

const AboutUsSection = dynamic(() => import("@/components/inicio/AboutUsSection"), {
  loading: () => <LoadingBar />,
});

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />

      {/* As seções abaixo serão carregadas sob demanda */}
      <HowItWorksSection />
      <FeaturesSection />
      <TeamSection />
      <AboutUsSection />

      <Footer />
    </div>
  );
}
