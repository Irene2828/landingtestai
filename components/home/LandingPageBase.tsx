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
          <div className="setup-utility-row">
            <button
              className="setup-help-trigger"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              onClick={() => setIsOpen(true)}
            >
              <span
                className="material-symbols-outlined setup-help-trigger-icon"
                aria-hidden="true"
              >
                info
              </span>
              <span>How it works</span>
            </button>
          </div>

          <section className="setup-main-column">
            <div className="setup-intro">
              <h2>
                <span>
                  <span className="setup-hero-accent">Evidence-based</span> UX audit
                </span>
                <span>for SaaS landing pages</span>
              </h2>
              <p className="setup-intro-body">
                Pulls messaging, CTA, and trust signals into one audit with
                confidence on every finding.
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
