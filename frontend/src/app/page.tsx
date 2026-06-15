import type { Metadata } from "next";
import LandingPage from "@/components/landing-page";

export const metadata: Metadata = {
  title: "CortexFlow - AI-Powered Cognitive Health Monitoring",
  description:
    "CortexFlow transforms speech into clinically actionable cognitive biomarkers. Multi-agent AI maps linguistic patterns to neural circuits in real-time for patients, caregivers, and healthcare providers.",
  keywords: [
    "Cognitive Health",
    "AI Screening",
    "Speech Analysis",
    "Biomarkers",
    "Neural Mapping",
    "Healthcare",
    "CortexFlow",
  ],
  openGraph: {
    title: "CortexFlow - AI-Powered Cognitive Health Monitoring",
    description:
      "Transform speech into clinically actionable cognitive biomarkers with multi-agent AI analysis.",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}