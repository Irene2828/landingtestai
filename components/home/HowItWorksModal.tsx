"use client";

import { useEffect, useRef, useState } from "react";

type HowItWorksModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const EXIT_ANIMATION_MS = 180;

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("disabled"));
}

export function HowItWorksModal({
  isOpen,
  onClose
}: HowItWorksModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsRendered(false);
    }, EXIT_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableElements = getFocusableElements(panelRef.current);
    const firstFocusable = focusableElements[0] ?? panelRef.current;
    firstFocusable.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const currentFocusable = getFocusableElements(panelRef.current);

      if (currentFocusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className={`how-it-works-overlay ${isOpen ? "how-it-works-overlay-open" : ""}`.trim()}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`how-it-works-modal ${isOpen ? "how-it-works-modal-open" : ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="how-it-works-modal-header">
          <h3 id="how-it-works-title">How it works</h3>
          <button
            type="button"
            className="how-it-works-close"
            onClick={onClose}
            aria-label="Close how it works"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="how-it-works-modal-body">
          <div className="how-it-works-copy">
            <p className="how-it-works-kicker">What you&apos;ll get</p>
            <p className="how-it-works-flow">
              Observation <span aria-hidden="true">→</span> Evidence{" "}
              <span aria-hidden="true">→</span> Recommendation
            </p>
            <p className="how-it-works-note">
              A quick preview of how the system turns extracted page content into
              a usable UX finding.
            </p>
          </div>

          <div className="how-it-works-sample-label">Sample output</div>

          <article className="how-it-works-preview">
            <div className="how-it-works-preview-top">
              <span className="how-it-works-preview-badge">Hero</span>
              <span className="how-it-works-preview-confidence">
                HIGH confidence
              </span>
            </div>

            <div className="how-it-works-preview-row">
              <span className="how-it-works-preview-label">Observation</span>
              <p>
                Example: The hero names the category but does not explain the
                user outcome.
              </p>
            </div>

            <div className="how-it-works-preview-row">
              <span className="how-it-works-preview-label">Evidence</span>
              <p>
                Example: The headline stays broad, while competitor headlines
                lead with a clearer outcome or workflow gain.
              </p>
            </div>

            <div className="how-it-works-preview-row">
              <span className="how-it-works-preview-label">
                Recommendation
              </span>
              <p>
                Example: Rewrite the first screen around one outcome and one
                primary CTA.
              </p>
            </div>
          </article>

          <div className="how-it-works-features" aria-label="Feature list">
            <span>✓ Real content extraction (not guessed)</span>
            <span>✓ Confidence levels on every finding</span>
            <span>✓ Named competitor benchmarks</span>
            <span>✓ Structured designer-grade output</span>
          </div>

          <p className="how-it-works-footnote">
            This version analyzes messaging and structure. Visual layout
            analysis is part of the next iteration.
          </p>
        </div>
      </div>
    </div>
  );
}
