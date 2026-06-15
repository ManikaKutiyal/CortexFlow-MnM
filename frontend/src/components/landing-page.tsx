"use client";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useColorMode } from "@/hooks/useColorMode";
import "./landing-page.css";

import {
  IconBrain, IconTimeline, IconShieldCheckered, IconChecklist, IconChartBar, IconHistory, IconMicroscope,
  IconHeartbeat, IconBellRinging, IconChartArcs, IconUsersGroup, IconLink,
  IconFileReport, IconTrendingUp, IconReportMedical, IconMicrophone2, IconBolt
} from "@tabler/icons-react";

const HeroFluidShape = dynamic(() => import("./hero-fluid-shape"), { ssr: false });

type DomainKey = "patient" | "caregiver" | "provider";

const DOMAIN_FEATURES: Record<DomainKey, { title: string; desc: string; icon: React.ReactNode; color: string }[]> = {
  patient: [
    { title: "Cognitive Analysis", desc: "AI-powered speech analysis with multi-agent biomarker extraction mapped to 5 neural circuits. Real-time 3D brain visualization.", icon: <IconBrain size={24} stroke={1.5} />, color: "#14b8a6" },
    { title: "Memory Lane", desc: "Curated memory prompts and nostalgia-driven exercises that strengthen recall and provide longitudinal cognitive snapshots.", icon: <IconTimeline size={24} stroke={1.5} />, color: "#3b82f6" },
    { title: "Safety Center", desc: "SOS alerts, safe-zone geofencing, emergency contacts, and wandering detection for comprehensive patient safety.", icon: <IconShieldCheckered size={24} stroke={1.5} />, color: "#ef4444" },
    { title: "Health Tasks", desc: "Daily medication reminders, exercise routines, appointment management, and wellness check-ins all in one place.", icon: <IconChecklist size={24} stroke={1.5} />, color: "#f59e0b" },
    { title: "Cognitive Assessments", desc: "Standardized MoCA-style screening tools, mini-mental status exams, and progress tracking over time.", icon: <IconChartBar size={24} stroke={1.5} />, color: "#a855f7" },
    { title: "Session History", desc: "Complete archive of all analysis sessions with searchable reports, trend graphs, and downloadable clinical summaries.", icon: <IconHistory size={24} stroke={1.5} />, color: "#1d9e75" },
    { title: "Brain Regions Explorer", desc: "Interactive 3D atlas of the 5 cortical regions mapped by CortexFlow, with MNI coordinates and neural pathway data.", icon: <IconMicroscope size={24} stroke={1.5} />, color: "#D85A30" },
  ],
  caregiver: [
    { title: "Patient Overview", desc: "Comprehensive dashboard showing your linked patient's cognitive metrics, recent sessions, and health status at a glance.", icon: <IconHeartbeat size={24} stroke={1.5} />, color: "#14b8a6" },
    { title: "Real-Time Alerts", desc: "Instant SOS notifications, missed medication alerts, and safety boundary breach warnings delivered in real-time.", icon: <IconBellRinging size={24} stroke={1.5} />, color: "#ef4444" },
    { title: "Cognitive Insights", desc: "Trend analysis of your patient's cognitive biomarkers over weeks and months, highlighting areas of concern.", icon: <IconChartArcs size={24} stroke={1.5} />, color: "#3b82f6" },
    { title: "Care Network", desc: "Connect with other caregivers, healthcare providers, and support groups in your patient's care circle.", icon: <IconUsersGroup size={24} stroke={1.5} />, color: "#f59e0b" },
    { title: "Care Tasks", desc: "Assign and track daily care activities, medication schedules, and appointment reminders for your patient.", icon: <IconChecklist size={24} stroke={1.5} />, color: "#a855f7" },
    { title: "Patient Link", desc: "Securely link to your patient's account with consent-based access controls and granular permission management.", icon: <IconLink size={24} stroke={1.5} />, color: "#1d9e75" },
  ],
  provider: [
    { title: "Patient Roster", desc: "Manage your complete patient cohort with sortable lists, risk stratification, and priority flagging.", icon: <IconUsersGroup size={24} stroke={1.5} />, color: "#14b8a6" },
    { title: "Clinical Records", desc: "Access comprehensive patient records, cognitive reports, and longitudinal data for informed clinical decisions.", icon: <IconFileReport size={24} stroke={1.5} />, color: "#3b82f6" },
    { title: "Population Trends", desc: "Cohort-level analytics showing biomarker distributions, treatment response patterns, and comparative outcomes.", icon: <IconTrendingUp size={24} stroke={1.5} />, color: "#a855f7" },
    { title: "Clinical Orders", desc: "Write and manage cognitive assessment orders, referrals, and treatment plans directly within the platform.", icon: <IconReportMedical size={24} stroke={1.5} />, color: "#f59e0b" },
    { title: "Speech Analysis", desc: "Review patient speech recordings with AI-extracted biomarkers, prosodic features, and linguistic complexity scores.", icon: <IconMicrophone2 size={24} stroke={1.5} />, color: "#D85A30" },
    { title: "Notifications Hub", desc: "Centralized alerts for critical patient events, new assessment results, and care team communications.", icon: <IconBellRinging size={24} stroke={1.5} />, color: "#ef4444" },
  ],
};

const PIPELINE_STEPS = [
  { title: "Speech Input", desc: "Record or paste text for instant analysis", icon: <IconMicrophone2 size={32} stroke={1.5} />, color: "#14b8a6" },
  { title: "AI Analysis", desc: "5 specialized agents extract cognitive biomarkers", icon: <IconBolt size={32} stroke={1.5} />, color: "#3b82f6" },
  { title: "Neural Mapping", desc: "Results mapped to MNI152 brain coordinates", icon: <IconBrain size={32} stroke={1.5} />, color: "#a855f7" },
  { title: "Clinical Report", desc: "Comprehensive cognitive signature report generated", icon: <IconFileReport size={32} stroke={1.5} />, color: "#D85A30" },
];

function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FeatureCard({ feature, index }: { feature: { title: string; desc: string; icon: React.ReactNode; color: string }; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="lp-feature-card"
    >
      <div
        className="lp-feature-icon"
        style={{ background: `${feature.color}12`, border: `1px solid ${feature.color}25` }}
      >
        {feature.icon}
      </div>
      <div className="lp-feature-title">{feature.title}</div>
      <div className="lp-feature-desc">{feature.desc}</div>
    </motion.div>
  );
}

export default function LandingPage() {
  const [activeDomain, setActiveDomain] = useState<DomainKey>("patient");
  const pipelineRef = useRef<HTMLDivElement>(null);
  const pipelineInView = useInView(pipelineRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!pipelineInView || !pipelineRef.current) return;
    const icons = pipelineRef.current.querySelectorAll(".lp-pipeline-icon-wrap");
    gsap.fromTo(
      icons,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, stagger: 0.15, ease: "back.out(1.7)" }
    );
    const connectors = pipelineRef.current.querySelectorAll(".lp-pipeline-connector");
    gsap.fromTo(
      connectors,
      { scaleX: 0, opacity: 0 },
      { scaleX: 1, opacity: 1, duration: 0.4, stagger: 0.15, delay: 0.3, ease: "power2.out" }
    );
  }, [pipelineInView]);

  return (
    <div className="lp-root lp-creme">
      <div className="lp-bg-overlay" />

      <nav className="lp-navbar" id="landing-navbar">
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="lp-navbar-brand">
          <Image
            src="/images/cf_face_idle.png"
            alt="CortexFlow"
            width={32}
            height={32}
            className="lp-navbar-logo"
            priority
          />
          <span className="lp-navbar-name">CortexFlow</span>
        </a>
        <div className="lp-navbar-links">
          <button className="lp-navbar-link" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
            Features
          </button>
          <button className="lp-navbar-link" onClick={() => document.getElementById("pipeline")?.scrollIntoView({ behavior: "smooth" })}>
            How It Works
          </button>
          <Link href="/about" className="lp-navbar-link">
            About
          </Link>
        </div>
        <Link href="/dashboard" className="lp-navbar-cta">
          Sign In
        </Link>
      </nav>

      <section className="lp-hero lp-section" id="hero">
        <div className="lp-hero-left">

          <FadeIn delay={0.1}>
            <h1 className="lp-hero-title">
              The Future of{" "}
              <span className="lp-hero-title-accent">Cognitive Health</span>{" "}
              Monitoring
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="lp-hero-subtitle">
              CortexFlow transforms speech into clinically actionable cognitive biomarkers.
              Our multi-agent AI system maps linguistic patterns to neural circuits in real-time,
              enabling early detection of cognitive decline for patients, caregivers, and healthcare providers.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="lp-hero-actions">
              <Link href="/dashboard" className="lp-btn-primary">
                Get Started
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <button
                className="lp-btn-secondary"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Features
              </button>
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
            <div className="lp-hero-trust">
              <div className="lp-trust-item">
                <svg className="lp-trust-icon" viewBox="0 0 16 16" fill="none"><path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1z" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 8l2 2 3-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                HIPAA-Aware Design
              </div>
              <div className="lp-trust-item">
                <svg className="lp-trust-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Real-Time Analysis
              </div>
              <div className="lp-trust-item">
                <svg className="lp-trust-icon" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0112 0M8 2v2M3.5 4l1.5 1M12.5 4L11 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
                5 AI Agents
              </div>
            </div>
          </FadeIn>
        </div>
        <motion.div
          className="lp-hero-right"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <HeroFluidShape />
        </motion.div>
      </section>

      <section className="lp-features lp-section" id="features">
        <FadeIn>
          <div className="lp-section-header">
            <span className="lp-section-label">Platform Capabilities</span>
            <h2 className="lp-section-title">
              Three Domains, One Mission
            </h2>
            <p className="lp-section-desc">
              CortexFlow serves every stakeholder in the cognitive health journey — from patients tracking their own brain health to providers managing entire cohorts.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="lp-domain-tabs" id="domain-tabs">
            {(["patient", "caregiver", "provider"] as DomainKey[]).map((domain) => (
              <button
                key={domain}
                className={`lp-domain-tab ${activeDomain === domain ? "active" : ""}`}
                onClick={() => setActiveDomain(domain)}
              >
                {domain === "patient" ? "Patient" : domain === "caregiver" ? "Caregiver" : "Healthcare Provider"}
              </button>
            ))}
          </div>
        </FadeIn>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDomain}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="lp-feature-grid"
          >
            {DOMAIN_FEATURES[activeDomain].map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="lp-pipeline lp-section" id="pipeline" ref={pipelineRef}>
        <FadeIn>
          <div className="lp-section-header">
            <span className="lp-section-label">How It Works</span>
            <h2 className="lp-section-title">From Speech to Insight in Seconds</h2>
            <p className="lp-section-desc">
              Our pipeline processes speech through five specialized AI agents, each analyzing a distinct cognitive domain and mapping results to specific brain regions.
            </p>
          </div>
        </FadeIn>
        <div className="lp-pipeline-steps">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.title} style={{ display: "contents" }}>
              <div className="lp-pipeline-step">
                <div className="lp-pipeline-icon-wrap" style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 24px ${step.color}15` }}>
                  <span style={{ fontSize: 28 }}>{step.icon}</span>
                </div>
                <div className="lp-pipeline-step-title">{step.title}</div>
                <div className="lp-pipeline-step-desc">{step.desc}</div>
              </div>
              {i < PIPELINE_STEPS.length - 1 && <div className="lp-pipeline-connector" />}
            </div>
          ))}
        </div>
      </section>

      <footer className="lp-footer lp-section" id="footer">
        <div className="lp-footer-left">
          <div className="lp-footer-brand">CortexFlow</div>
          <div className="lp-footer-copy">© {new Date().getFullYear()} CortexFlow. All rights reserved.</div>
        </div>
        <div className="lp-footer-right">
          <a href="https://mnmworks.xyz" target="_blank" rel="noreferrer" className="lp-footer-link">Developers</a>
          <Link href="/about" className="lp-footer-link">About</Link>
          <a href="mailto:contact.manikaditya@gmail.com" className="lp-footer-link">Contact</a>
        </div>
      </footer>
    </div>
  );
}
