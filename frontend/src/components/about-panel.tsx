"use client";

import * as React from "react";
import Image from "next/image";
import { ExternalLink, Linkedin, Users, Brain, Sparkles, Target, Trophy } from "lucide-react";

type AboutPanelProps = {
  isDark?: boolean;
};

type TeamMember = {
  name: string;
  role: string;
  about: string;
  linkedin: string;
  avatar: string;
};

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Manika Kutiyal",
    role: "Web Developer • UI/UX Focus",
    about: "Focused on building intuitive, clean, and user-friendly interfaces that make complex systems feel simple.",
    linkedin: "https://www.linkedin.com/in/manika-kutiyal/",
    avatar: "/images/Manna.png",
  },
  {
    name: "Aditya Verma",
    role: "ML Systems • AI Engineering",
    about: "Works on model integration, inference pipelines, and scalable backend systems for real-time analysis.",
    linkedin: "https://www.linkedin.com/in/adityaverma9777/",
    avatar: "/images/Aditya.png",
  },
];

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]" style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)" }}>
      <Icon size={20} className="text-[#1D9E75]" />
    </div>
    <h2 className="text-[18px] font-semibold tracking-tight sm:text-[20px]" style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne), sans-serif" }}>
      {title}
    </h2>
  </div>
);

const BulletItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <div className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1D9E75]" />
    <span className="leading-relaxed">{children}</span>
  </li>
);

export function AboutPanel({ isDark = false }: AboutPanelProps) {
  const mnmLogo = isDark
    ? "/images/mnm logo dark mode .png"
    : "/images/mnm logo light mode .png";

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl pb-10">
        <section
          className="relative overflow-hidden rounded-[26px] p-[1px]"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(45,212,191,0.4), rgba(56,189,248,0.22), rgba(251,146,60,0.28))"
              : "linear-gradient(135deg, rgba(20,184,166,0.48), rgba(56,189,248,0.24), rgba(249,115,22,0.34))",
            boxShadow: isDark
              ? "0 14px 50px rgba(0,0,0,0.38)"
              : "0 16px 46px rgba(6,28,42,0.15)",
          }}
        >
          <div
            className="relative rounded-[25px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9 lg:py-10"
            style={{
              background: isDark
                ? "linear-gradient(180deg, rgba(4,20,33,0.92), rgba(6,22,35,0.86))"
                : "linear-gradient(180deg, rgba(249,253,255,0.92), rgba(243,249,252,0.84))",
              border: "1px solid var(--nt-glass-border)",
            }}
          >
            <div
              className="pointer-events-none absolute -top-12 -left-12 h-40 w-40 rounded-full blur-3xl"
              style={{ background: "rgba(20,184,166,0.18)" }}
            />
            <div
              className="pointer-events-none absolute -right-8 -bottom-14 h-44 w-44 rounded-full blur-3xl"
              style={{ background: "rgba(249,115,22,0.16)" }}
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <span
                  className="text-[34px] font-light tracking-[0.14em] sm:text-[44px]"
                  style={{
                    fontFamily: "var(--font-syne), sans-serif",
                    color: "var(--nt-text-hi)",
                    textShadow: isDark
                      ? "0 0 24px rgba(45,212,191,0.1), 0 2px 12px rgba(0,0,0,0.4)"
                      : "0 0 24px rgba(10,23,36,0.1), 0 2px 9px rgba(10,23,36,0.12)",
                  }}
                >
                  cortexflow
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.29em]"
                  style={{ color: "var(--nt-text-md)", fontFamily: "var(--font-dm-sans), sans-serif" }}
                >
                  cognitive signature analysis
                </span>
              </div>

              <div className="flex w-full max-w-[420px] flex-col items-start lg:items-end">
                <Image
                  src={mnmLogo}
                  alt="MnM logo"
                  width={900}
                  height={340}
                  className="h-auto w-full object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section
          className="mt-5 flex flex-col gap-10 rounded-3xl p-5 sm:p-8 lg:p-10 lg:px-12"
          style={{
            background: "var(--nt-glass)",
            border: "1px solid var(--nt-glass-border)",
            boxShadow: "var(--nt-glass-shadow)",
          }}
        >
          {/* About MnM */}
          <div>
            <SectionHeader icon={Users} title="About MnM" />
            <div className="space-y-4 text-[14.5px] leading-[1.7] sm:text-[15.5px]" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              <p>
                <strong style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>MnM</strong> is a two-person engineering team built by Manika Kutiyal and Aditya Verma.
              </p>
              <p>
                We focus on building practical, real-world AI systems that prioritize usability, clarity, and measurable impact over unnecessary complexity.
              </p>
              <div className="pt-1">
                <p className="mb-2.5 font-medium" style={{ color: "var(--nt-text-hi)" }}>Our work sits at the intersection of:</p>
                <ul className="space-y-2.5 pl-1.5">
                  <BulletItem>Applied AI systems</BulletItem>
                  <BulletItem>Human-centered design</BulletItem>
                  <BulletItem>Scalable full-stack engineering</BulletItem>
                </ul>
              </div>
              <p className="pt-2">
                <strong style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>CortexFlow</strong> is our attempt to take something traditionally complex and inaccessible, cognitive signal analysis, and make it fast, interpretable, and deployable in real environments.
              </p>
            </div>
          </div>

          <div className="h-[1px] w-full" style={{ background: "var(--nt-divider)" }} />

          {/* About CortexFlow */}
          <div>
            <SectionHeader icon={Brain} title="About CortexFlow" />
            <div className="space-y-4 text-[14.5px] leading-[1.7] sm:text-[15.5px]" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              <p>
                <strong style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>CortexFlow</strong> is a full-stack cognitive signal analysis platform designed for rapid screening workflows using text and speech inputs.
              </p>
              <div className="pt-1">
                <p className="mb-2.5 font-medium" style={{ color: "var(--nt-text-hi)" }}>It combines:</p>
                <ul className="space-y-2.5 pl-1.5">
                  <BulletItem>Browser-based voice capture</BulletItem>
                  <BulletItem>AI-powered transcription (Gemini APIs)</BulletItem>
                  <BulletItem>Deterministic linguistic feature extraction</BulletItem>
                  <BulletItem>Real-time structured reporting</BulletItem>
                </ul>
              </div>
              <div className="pt-2">
                <p className="mb-2.5 font-medium" style={{ color: "var(--nt-text-hi)" }}>The platform analyzes inputs across five core domains:</p>
                <ul className="grid gap-x-6 gap-y-2.5 pl-1.5 sm:grid-cols-2">
                  <BulletItem>Lexical patterns</BulletItem>
                  <BulletItem>Semantic coherence</BulletItem>
                  <BulletItem>Prosodic behavior (speech timing and pauses)</BulletItem>
                  <BulletItem>Syntactic structure</BulletItem>
                  <BulletItem>Affective markers</BulletItem>
                </ul>
              </div>
              <p className="pt-2">
                These signals are mapped into interpretable cognitive indicators and visualized inside an interactive 3D brain workspace, making abstract data easier to understand and explore.
              </p>
            </div>
          </div>

          <div className="h-[1px] w-full" style={{ background: "var(--nt-divider)" }} />

          {/* What Makes It Different */}
          <div>
            <SectionHeader icon={Sparkles} title="What Makes It Different" />
            <div className="space-y-4 text-[14.5px] leading-[1.7] sm:text-[15.5px]" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              <p>
                CortexFlow is not just another AI demo. It is engineered as a usable system:
              </p>
              <ul className="space-y-2.5 pl-1.5">
                <BulletItem>Real-time processing with streaming reports</BulletItem>
                <BulletItem>Clear separation between AI inference and deterministic analysis</BulletItem>
                <BulletItem>Non-diagnostic, safety-framed outputs</BulletItem>
                <BulletItem>Full-stack deployment readiness (Vercel + container backend)</BulletItem>
                <BulletItem>Authentication and report history support</BulletItem>
              </ul>
              <div className="pt-2">
                <p className="mb-2.5 font-medium" style={{ color: "var(--nt-text-hi)" }}>We focused on building something that:</p>
                <ul className="space-y-2.5 pl-1.5">
                  <BulletItem>Judges can run locally</BulletItem>
                  <BulletItem>Developers can extend</BulletItem>
                  <BulletItem>Users can actually interact with meaningfully</BulletItem>
                </ul>
              </div>
            </div>
          </div>

          <div className="h-[1px] w-full" style={{ background: "var(--nt-divider)" }} />

          {/* Why We Built This */}
          <div>
            <SectionHeader icon={Target} title="Why We Built This" />
            <div className="space-y-4 text-[14.5px] leading-[1.7] sm:text-[15.5px]" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              <div>
                <p className="mb-2.5">Early cognitive signals often exist in language and speech patterns, but tools to analyze them are:</p>
                <ul className="space-y-2.5 pl-1.5">
                  <BulletItem>Hard to access</BulletItem>
                  <BulletItem>Clinically gated</BulletItem>
                  <BulletItem>Not designed for rapid or scalable screening</BulletItem>
                </ul>
              </div>
              <div className="pt-2">
                <p className="mb-2.5 font-medium" style={{ color: "var(--nt-text-hi)" }}>CortexFlow explores how modern AI + structured analysis can:</p>
                <ul className="space-y-2.5 pl-1.5">
                  <BulletItem>Make early signals more observable</BulletItem>
                  <BulletItem>Enable awareness before intervention</BulletItem>
                  <BulletItem>Provide interpretable outputs instead of black-box scores</BulletItem>
                </ul>
              </div>
              <div className="mt-4 rounded-2xl p-4 sm:p-5" style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)" }}>
                <p className="leading-relaxed">
                  <strong style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>Note:</strong> This project is not a diagnostic tool. It is a screening and exploration system designed to demonstrate how accessible cognitive analysis workflows can be built responsibly.
                </p>
              </div>
            </div>
          </div>

          <div className="h-[1px] w-full" style={{ background: "var(--nt-divider)" }} />

          {/* Hackathon Context */}
          <div>
            <SectionHeader icon={Trophy} title="Hackathon Context" />
            <div className="space-y-4 text-[14.5px] leading-[1.7] sm:text-[15.5px]" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              <p>
                CortexFlow is built as a hackathon-ready system, not just a prototype.
              </p>
              <ul className="grid gap-x-6 gap-y-2.5 pl-1.5 sm:grid-cols-2">
                <BulletItem>Clean monorepo architecture</BulletItem>
                <BulletItem>Local demo with auth bypass</BulletItem>
                <BulletItem>Deployment-ready structure</BulletItem>
                <BulletItem>Clear API boundaries</BulletItem>
              </ul>
              <p className="pt-3 text-[15.5px] font-medium leading-relaxed italic sm:text-[16.5px]" style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne), sans-serif" }}>
                "The goal was simple: Build something real, usable, and technically honest under constraints."
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-4 px-1">
            <h2
              className="text-[17px] font-semibold sm:text-[19px]"
              style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne), sans-serif" }}
            >
              Core Team
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {TEAM_MEMBERS.map((member, index) => (
              <a
                key={member.name}
                href={member.linkedin}
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden rounded-[22px] p-[1px]"
                style={{
                  background: isDark
                    ? "linear-gradient(130deg, rgba(45,212,191,0.36), rgba(59,130,246,0.2), rgba(249,115,22,0.32))"
                    : "linear-gradient(130deg, rgba(29,158,117,0.38), rgba(59,130,246,0.22), rgba(249,115,22,0.32))",
                }}
              >
                <article
                  className="flex h-full flex-col rounded-[21px] p-5"
                  style={{
                    background: "var(--nt-glass-hi)",
                    border: "1px solid var(--nt-glass-border)",
                    boxShadow: "var(--nt-glass-shadow)",
                  }}
                >
                  <div className="mb-4 flex items-center gap-3.5">
                    <div
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full"
                      style={{ border: "2px solid var(--nt-divider)", background: "var(--nt-hover)" }}
                    >
                      <Image
                        src={member.avatar}
                        alt={`${member.name} profile image`}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3
                        className="truncate text-[15px] font-semibold"
                        style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne), sans-serif" }}
                      >
                        {member.name}
                      </h3>
                      <p
                        className="mt-0.5 text-[12px] leading-snug"
                        style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-dm-sans), sans-serif" }}
                      >
                        {member.role}
                      </p>
                    </div>
                  </div>

                  <p
                    className="flex-1 text-[13px] leading-[1.6]"
                    style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-dm-sans), sans-serif" }}
                  >
                    {member.about}
                  </p>

                  <div
                    className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors group-hover:bg-opacity-80"
                    style={{
                      background: "var(--nt-hover)",
                      border: "1px solid var(--nt-divider)",
                      color: "var(--nt-text-hi)",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                    }}
                  >
                    <Linkedin size={13} className="text-[#0A66C2]" />
                    <span>Connect</span>
                    <ExternalLink size={12} className="ml-1 opacity-50 transition-opacity group-hover:opacity-100" />
                  </div>
                </article>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
