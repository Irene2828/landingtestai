"use client";

import { useState, useRef, useEffect } from "react";
import {
  MousePointerClick,
  ShieldCheck,
  Eye,
  MessageSquare,
  Zap,
  ChevronDown,
  Info,
  ArrowUpRight,
  type LucideIcon
} from "lucide-react";

import type { SectionAnalysis, AnalysisSectionKey } from "@/lib/types";

type AnalysisAccordionProps = {
  sections: SectionAnalysis[];
};

const sectionIconByKey: Record<AnalysisSectionKey, LucideIcon> = {
  "FIRST IMPRESSION": Eye,
  "CALL TO ACTION": MousePointerClick,
  "TRUST & CREDIBILITY": ShieldCheck,
  "MESSAGING CLARITY": MessageSquare,
  "CONVERSION FRICTION": Zap
};

function BentoCard({ section, index, isGap }: { section: SectionAnalysis, index: number, isGap: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    }
    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);
  
  const SectionIcon = sectionIconByKey[section.name as AnalysisSectionKey] || Eye;
  
  return (
    <div style={{ 
      background: '#FFFFFF', 
      borderRadius: '24px', 
      border: `1px solid ${isGap ? 'rgba(0, 0, 0, 0.06)' : '#EBEBEB'}`, 
      padding: '24px',
      minHeight: '160px',
      height: '100%',
      display: 'flex',
      gap: '16px',
      position: 'relative',
      transition: 'all 0.3s ease',
      boxShadow: isGap ? '0 8px 30px rgba(0, 0, 0, 0.03)' : '0 4px 12px rgba(0,0,0,0.01)'
    }}>
      {/* Icon Column */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ 
          width: '44px', 
          height: '44px', 
          borderRadius: '14px', 
          background: 'rgba(255, 255, 255, 0.4)', 
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 87, 255, 0.1)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#0057FF',
          boxShadow: '0 4px 8px rgba(0, 87, 255, 0.04)',
          filter: 'drop-shadow(0 2px 3px rgba(0, 87, 255, 0.06))',
          position: 'relative'
        }}>
          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0057FF" />
                <stop offset="100%" stopColor="#09B8B3" />
              </linearGradient>
            </defs>
          </svg>
          <SectionIcon 
            size={22} 
            strokeWidth={1.5}
            color={`url(#grad-${index})`}
          />
        </div>
      </div>

      {/* Content Column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0D0D0D', letterSpacing: '-0.02em', margin: 0 }}>
          {section.name.replace(/_/g, ' ')}
        </h3>
        <p style={{ 
          fontSize: '15px', 
          color: '#4B5563', 
          lineHeight: 1.6, 
          margin: 0,
          fontWeight: 400
        }}>
          {section.finding}
        </p>
      </div>

      {/* Methodology Info Icon (Small, recessive) */}
      {!isExpanded && (
        <div style={{ position: 'absolute', bottom: '24px', right: '24px' }}>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#D1D5DB' }}
          >
            <Info size={14} />
          </button>
          {showTooltip && (
            <div style={{
              position: 'absolute', bottom: '24px', right: '0', width: '220px', padding: '12px',
              background: '#0D0D0D', color: '#FFFFFF', borderRadius: '8px', fontSize: '10px', lineHeight: 1.4, zIndex: 100
            }}>
              Axiom diagnostic mapping via GPT-4o.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export function AnalysisAccordion({ sections }: AnalysisAccordionProps) {
  const gaps = sections.filter(s => s.status !== 'strong');
  const successes = sections.filter(s => s.status === 'strong');
  
  const overallScore = Math.round(sections.reduce((acc, s) => acc + (s.score || 0), 0) / sections.length);

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal-animated {
          animation: slideUpFade 0.6s ease-out forwards;
        }
      `}</style>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '48px', 
        alignItems: 'flex-start' 
      }}>
        {/* LEFT COLUMN: THE 'SUCCESS' TIER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #DCFCE7', paddingBottom: '12px', margin: 0 }}>
            What's working well: ({successes.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {successes.length > 0 ? successes.map((section, idx) => (
              <div key={section.name} className="reveal-animated" style={{ animationDelay: `${idx * 0.15}s` }}>
                <BentoCard section={section} index={idx} isGap={false} />
              </div>
            )) : (
              <p style={{ fontSize: '14px', color: '#6B6B6B', fontStyle: 'italic' }}>No significant strengths identified.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: THE 'GAP' PRIORITY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', margin: 0 }}>
            Identified Gaps & Opportunities ({gaps.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {gaps.length > 0 ? gaps.map((section, idx) => (
              <div key={section.name} className="reveal-animated" style={{ animationDelay: `${(successes.length + idx) * 0.15}s` }}>
                <BentoCard section={section} index={successes.length + idx} isGap={true} />
              </div>
            )) : (
              <p style={{ fontSize: '14px', color: '#6B6B6B', fontStyle: 'italic' }}>No critical gaps identified.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
