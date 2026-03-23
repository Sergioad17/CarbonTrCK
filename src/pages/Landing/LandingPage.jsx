import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import "./landing.css";
import "../BackgroundPatterns/Pattern3_Landing.css";

import useScrolled from "./hooks/useScrolled";
import Particles from "./components/Particles";
import Navbar from "./sections/Navbar";
import HeroSection from "./sections/HeroSection";
import TrustedSection from "./sections/TrustedSection";
import ProblemSection from "./sections/ProblemSection";
import SolutionSection from "./sections/SolutionSection";
import FeaturesSection from "./sections/FeaturesSection";
import FormulasSection from "./sections/FormulasSection";
import ProcessSection from "./sections/ProcessSection";
import DifferentiationSection from "./sections/DifferentiationSection";
import UseCasesSection from "./sections/UseCasesSection";
import TestimonialsSection from "./sections/TestimonialsSection";
import FinalCTASection from "./sections/FinalCTASection";
import FooterSection from "./sections/FooterSection";

import { PAINS, FEATS, DIFFS, CASES, TESTS } from "./content";

export default function LandingPage() {
  const navigate = useNavigate();
  const scrolled = useScrolled(40);

  const go = () => navigate("/login");

  // keep arrays stable
  const pains = useMemo(() => PAINS, []);
  const feats = useMemo(() => FEATS, []);
  const diffs = useMemo(() => DIFFS, []);
  const casesList = useMemo(() => CASES, []);
  const tests = useMemo(() => TESTS, []);

  return (
    <div
      className="lnd eco-pattern3"
      onMouseMove={(e) => {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + el.scrollTop;
        el.style.setProperty("--glow-x", x + "px");
        el.style.setProperty("--glow-y", y + "px");
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.setProperty("--glow-x", "-9999px");
        el.style.setProperty("--glow-y", "-9999px");
      }}
    >
      <Particles />

      <Navbar scrolled={scrolled} onGo={go} />
      <HeroSection onGo={go} />
      <TrustedSection />
      <ProblemSection pains={pains} />
      <SolutionSection />
      <FeaturesSection feats={feats} />
      <FormulasSection />
      <ProcessSection />
      <DifferentiationSection diffs={diffs} />
      <UseCasesSection casesList={casesList} />
      <TestimonialsSection tests={tests} />
      <FinalCTASection onGo={go} />
      <FooterSection />
    </div>
  );
}
