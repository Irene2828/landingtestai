"use client";

import { useState } from "react";

import { AnalysisSetupForm } from "@/components/analyzer/AnalysisSetupForm";
import { HowItWorksModal } from "@/components/home/HowItWorksModal";
import { AppHeader } from "@/components/shared/AppHeader";

type LandingPageBaseProps = {
  tagline: string;
};

export function LandingPageBase({ tagline }: LandingPageBaseProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="setup-shell">
      <AppHeader tagline={tagline} />

      <main className="setup-main">
        <div className="setup-container">
          <section className="setup-main-column">
            <div className="setup-intro">
              <div className="setup-intro-header">
                <div className="setup-title-row">
                  <h1 className="setup-title">
                    <span>
                      <span className="setup-hero-accent">Evidence-based</span> UX
                      audit
                    </span>
                    <span>for SaaS landing pages</span>
                  </h1>
                  <button
                    className="setup-help-trigger"
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    aria-label="How it works"
                    onClick={() => setIsOpen(true)}
                  >
                    <span
                      className="material-symbols-outlined setup-help-trigger-icon"
                      aria-hidden="true"
                    >
                      info
                    </span>
                    <span className="setup-help-trigger-label">How it works</span>
                  </button>
                </div>
              </div>
              <p className="setup-intro-body">
                Compare your messaging, CTAs, and trust signals to competitors
                {" \u2014 "}
                <br />
                get insights and confidence on every finding
              </p>
            </div>

            <AnalysisSetupForm />
          </section>

          <HowItWorksModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
      </main>
    </div>
  );
}
