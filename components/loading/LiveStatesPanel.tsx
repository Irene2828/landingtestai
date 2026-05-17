"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const STEPS = [
  "Fetching page content",
  "Extracting headlines and CTAs",
  "Reading trust signals",
  "Evaluating conversion gaps",
  "Scoring each section",
  "Generating opportunity report"
];

export function LiveStatesPanel({ onCancel }: { onCancel?: () => void }) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        }
        return prev; // Stay on the last step until API finishes
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: '500px' }}>
      
      {/* Top Animated Spinner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <style>{`
              @keyframes pulse-dot {
                0%, 100% { opacity: 0.15; transform: scale(0.85); }
                50% { opacity: 0.8; transform: scale(1.15); }
              }
            `}</style>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30) * (Math.PI / 180);
              const radius = 28;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#0057FF',
                    left: `calc(50% + ${x}px - 2.5px)`,
                    top: `calc(50% + ${y}px - 2.5px)`,
                    animation: `pulse-dot 1.2s infinite ease-in-out`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              );
            })}
            <div style={{ fontSize: '12px', color: '#0057FF', fontWeight: 700 }}>
              {Math.min(activeStepIndex + 1, STEPS.length)}
            </div>
          </div>
          <div style={{ fontSize: '18px', color: '#0D0D0D', fontWeight: 600 }}>
            {STEPS[activeStepIndex]}
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#6B6B6B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
          >
            Cancel analysis
          </button>
        )}
      </div>

      {/* Steps List - Stacked & Grey */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {STEPS.map((step, index) => {
          const isComplete = index < activeStepIndex;
          const isActive = index === activeStepIndex;
          const isPending = index > activeStepIndex;

          return (
            <div
              key={step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '6px 0',
                transition: 'all 0.4s ease',
                opacity: isPending ? 0.3 : 1
              }}
            >
              <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                {isComplete ? (
                  <Check size={14} color="#9CA3AF" strokeWidth={3} />
                ) : isActive ? (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0057FF', boxShadow: '0 0 10px rgba(0,87,255,0.4)' }} />
                ) : (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E5E7EB' }} />
                )}
              </div>
              <div
                style={{
                  fontSize: '15px',
                  color: isComplete ? '#9CA3AF' : isActive ? '#0D0D0D' : '#D1D5DB',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: isComplete ? 'line-through' : 'none',
                  transition: 'all 0.4s ease'
                }}
              >
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
