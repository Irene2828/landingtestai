"use client";

import { useState } from "react";
import { X, ArrowUpRight, ArrowRight, ArrowLeft, Info, ChevronDown, Target, Layout, MousePointer2, Sparkles, Check, Send, AlertTriangle, ArrowDown, Plus, Minus } from "lucide-react";
import type { AnalyzeApiResponse } from "@/lib/types";

type AxiomReportOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  result: AnalyzeApiResponse | null;
  url: string;
};

function CollapsibleItem({ 
  title, 
  children, 
  isOpen, 
  onToggle 
}: { 
  title: React.ReactNode, 
  children: React.ReactNode, 
  isOpen: boolean, 
  onToggle: () => void 
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <button 
        onClick={onToggle}
        style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          gap: '16px'
        }}
      >
        <div style={{ flex: 1 }}>{title}</div>
        <div style={{ 
          color: '#9CA3AF', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '2px',
          transition: 'color 0.2s ease'
        }}>
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </div>
      </button>
      
      {isOpen && (
        <div style={{ animation: 'reveal 0.3s ease forwards' }}>
          {children}
        </div>
      )}
    </div>
  );
}
function TruncatedText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text) return null;
  
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  if (wordCount <= 150) {
    return (
      <span style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.6, display: 'block', marginTop: '4px' }}>
        {text}
      </span>
    );
  }
  
  const truncatedText = words.slice(0, 150).join(" ") + "...";
  
  return (
    <span style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.6, display: 'block', marginTop: '4px' }}>
      {isExpanded ? text : truncatedText}{" "}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          color: '#0057FF',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          marginLeft: '4px',
          textDecoration: 'underline'
        }}
      >
        {isExpanded ? "Read less" : "Read more"}
      </button>
    </span>
  );
}

export function AxiomReportOverlay({ isOpen, result, url }: { isOpen: boolean; result: AnalyzeApiResponse | null; url: string; }) {
  const [showInfo, setShowInfo] = useState(false);
  const [positioningExpanded, setPositioningExpanded] = useState(true);
  const [uxExpanded, setUxExpanded] = useState(true);
  const [ctaExpanded, setCtaExpanded] = useState(true);
  const [copyExpanded, setCopyExpanded] = useState(true);
  const [openDetailsIndex, setOpenDetailsIndex] = useState<number>(-1);

  if (!isOpen || !result) return null;

  const overallImpression = result.overall_impression;
  const industryModernity = result.industry_modernity || "";
  const frictionAudit = Array.isArray(result.friction_audit) ? result.friction_audit : [];

  return (
    <div style={{ 
      width: '100%',
      animation: 'reveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      <style>{`
        @keyframes reveal {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stagger-1 { animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .stagger-2 { animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
        .closing-cta-container {
          width: 100% !important;
          margin: 32px auto 0 auto !important;
        }
        .closing-cta-card {
          padding: 32px 20px 24px 20px !important;
        }
        .closing-cta-btn {
          height: 52px;
          padding: 0 20px;
          border-radius: 26px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: none;
          transition: all 0.2s ease;
          width: 100%;
          max-width: 290px;
          white-space: nowrap;
          background-color: #FFFFFF !important;
          color: #111827 !important;
          border: none !important;
        }
        @media (min-width: 480px) {
          .closing-cta-btn {
            height: 56px;
            padding: 0 32px;
            border-radius: 28px;
            font-size: 16px;
            width: fit-content;
            max-width: none;
          }
        }
        @media (min-width: 768px) {
          .closing-cta-btn {
            background-color: transparent !important;
            color: #FFFFFF !important;
            border: 1px solid #FFFFFF !important;
          }
          .closing-cta-btn:hover {
            background-color: #FFFFFF !important;
            color: #111827 !important;
            transform: translateY(-2px);
          }
        }
        .closing-cta-title {
          font-size: 25px !important;
        }
        @media (min-width: 480px) {
          .closing-cta-card {
            padding: 56px 40px 48px 40px !important;
          }
          .closing-cta-title {
            font-size: 28px !important;
          }
        }
        @media (min-width: 768px) {
          .closing-cta-container {
            width: 80% !important;
            margin: 48px auto 0 auto !important;
          }
        }
        @media (min-width: 900px) {
          .results-grid-md {
            grid-template-columns: 1fr 1fr !important;
            align-items: stretch !important;
            gap: 32px !important;
          }
        }
        .results-card {
          background: #FFFFFF !important; 
          border-radius: 24px !important; 
          border: 1px solid #E5E7EB !important; 
          padding: 24px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
        }
        @media (min-width: 480px) {
          .results-card {
            padding: 32px !important;
          }
        }
        @media (min-width: 768px) {
          .results-card {
            padding: 40px !important;
          }
        }
      `}</style>

      {/* LIGHT FLOW SECTION */}
      <div style={{ 
        width: '100%', 
        backgroundColor: '#FFFFFF',
        padding: '40px 0 0 0',
        marginBottom: '0px'
      }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 16px' }}>
          
          {/* TWO-COLUMN CARD GRID */}
          <div className="results-grid-md" style={{ 
            width: '100%',
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '32px'
          }}>
        
            {/* COLUMN 1: EXECUTIVE SUMMARY */}
            <div className="stagger-1" style={{ 
              display: 'flex',
              flexDirection: 'column',
              flex: 1
            }}>
              <div className="results-card">
                {overallImpression && (
                  <>
                    {/* Integrated Audit Completed Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px', width: '100%' }}>
                      <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ 
                          position: 'absolute', 
                          inset: 0, 
                          borderRadius: '50%', 
                          border: '2px solid rgba(0, 87, 255, 0.1)',
                          borderTopColor: '#0057FF',
                          borderRightColor: '#00A69C',
                          transform: 'rotate(-45deg)'
                        }} />
                        <Check size={30} color="#0057FF" strokeWidth={2} />
                      </div>
                      
                      <div style={{ position: 'relative' }}>
                        <h2 style={{ 
                          fontSize: '15px', 
                          fontWeight: 700, 
                          background: 'linear-gradient(135deg, #0057FF, #00A69C)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          margin: 0
                        }}>
                          Audit completed
                        </h2>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <CollapsibleItem 
                        isOpen={positioningExpanded}
                        onToggle={() => setPositioningExpanded(!positioningExpanded)}
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Target size={18} color="#9CA3AF" />
                            <strong style={{ fontSize: '15px', color: '#111827', fontWeight: 600 }}>Positioning Clarity</strong>
                          </div>
                        }
                      >
                        <TruncatedText text={overallImpression.positioning} />
                      </CollapsibleItem>

                      <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.05)' }} />

                      <CollapsibleItem 
                        isOpen={uxExpanded}
                        onToggle={() => setUxExpanded(!uxExpanded)}
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Layout size={18} color="#9CA3AF" />
                            <strong style={{ fontSize: '15px', color: '#111827', fontWeight: 600 }}>UX Hierarchy & Architecture</strong>
                          </div>
                        }
                      >
                        <TruncatedText text={overallImpression.ux_hierarchy} />
                      </CollapsibleItem>

                      <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.05)' }} />

                      <CollapsibleItem 
                        isOpen={ctaExpanded}
                        onToggle={() => setCtaExpanded(!ctaExpanded)}
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <MousePointer2 size={18} color="#9CA3AF" />
                            <strong style={{ fontSize: '15px', color: '#111827', fontWeight: 600 }}>CTA Strategy</strong>
                          </div>
                        }
                      >
                        <TruncatedText text={overallImpression.cta_strategy} />
                      </CollapsibleItem>

                      {industryModernity && (
                        <>
                          <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.05)' }} />
                          <CollapsibleItem 
                            isOpen={copyExpanded}
                            onToggle={() => setCopyExpanded(!copyExpanded)}
                            title={
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sparkles size={18} color="#9CA3AF" />
                                <strong style={{ fontSize: '15px', color: '#111827', fontWeight: 600 }}>Copy Modernity & Relevance</strong>
                              </div>
                            }
                          >
                            <TruncatedText text={industryModernity} />
                          </CollapsibleItem>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* COLUMN 2: SPECIFIC FAILURES */}
            <div className="stagger-1" style={{ 
              display: 'flex',
              flexDirection: 'column',
              flex: 1
            }}>
              <div className="results-card">
                {/* Quick Fixes Header with Baseline Space + Real Arrow Down placed under text */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px', width: '100%' }}>
                  {/* Invisible 60px spacer box to keep perfect baseline alignment with the left card's check badge */}
                  <div style={{ height: '60px' }} />
                  
                  <div style={{ position: 'relative' }}>
                    <h2 style={{ 
                      fontSize: '15px', 
                      fontWeight: 500, 
                      color: '#4B5563',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      margin: 0
                    }}>
                      Quick Fixes
                    </h2>
                  </div>

                  {/* Real Arrow Down under Quick Fixes text (Pronounced Gradient Blue/Teal SVG with Stick) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '6px' }}>
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="url(#arrow-down-gradient)" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ display: 'block' }}
                    >
                      <defs>
                        <linearGradient id="arrow-down-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0057FF" />
                          <stop offset="100%" stopColor="#00A69C" />
                        </linearGradient>
                      </defs>
                      <path d="M12 4v16" />
                      <path d="M6 14l6 6 6-6" />
                    </svg>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {frictionAudit.map((friction, index) => (
                    <div key={index}>
                      <CollapsibleItem 
                        isOpen={openDetailsIndex === index}
                        onToggle={() => setOpenDetailsIndex(openDetailsIndex === index ? -1 : index)}
                        title={
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            color: '#6B7280', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.1em' 
                          }}>
                            {friction.location}
                          </span>
                        }
                      >
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '20px',
                          marginTop: '16px'
                        }}>
                          {/* The Problem Text (Muted Blockquote) */}
                          <div style={{ 
                            padding: '4px 0 4px 16px', 
                            borderLeft: '2px solid #E5E7EB'
                          }}>
                            <span style={{ fontSize: '15px', color: '#6B7280', fontStyle: 'italic', lineHeight: 1.6 }}>
                              "{friction.current_text}"
                            </span>
                          </div>

                          {/* The Analysis */}
                          <div style={{ fontSize: '15px', color: '#374151', lineHeight: 1.6 }}>
                            {friction.friction_analysis}
                          </div>

                          {/* High-Converting Alternative (Premium Gradient Styling) */}
                          <div style={{ 
                            padding: '4px 0', 
                            marginTop: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start'
                          }}>
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: 700, 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.08em', 
                              background: 'linear-gradient(135deg, #0057FF, #00A69C)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              display: 'block',
                              marginBottom: '8px'
                            }}>
                              High-Converting Alternative
                            </span>
                            <span style={{ fontSize: '16px', color: '#111827', fontWeight: 500, lineHeight: 1.5 }}>
                              {friction.better_alternative}
                            </span>
                          </div>
                        </div>
                      </CollapsibleItem>
                      {index < frictionAudit.length - 1 && (
                        <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.05)', marginTop: '24px' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* WIDE CLOSING CTA BLOCK */}
          <div className="stagger-2 closing-cta-container" style={{ 
            zIndex: 10
          }}>
            <div className="closing-cta-card" style={{ 
              background: 'linear-gradient(135deg, #0057FF, #00A69C)',
              borderRadius: '24px', 
              boxShadow: '0 10px 20px -6px rgba(0, 87, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <p className="closing-cta-title" style={{ 
                  fontWeight: 700, 
                  lineHeight: 1.3, 
                  color: '#FFFFFF', 
                  maxWidth: '560px',
                  margin: '0 0 32px 0',
                  textAlign: 'center'
                }}>
                  Let's fix what's holding you back.
                </p>

                {/* Primary CTA */}
                <a 
                  href="https://south.digital"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="closing-cta-btn"
                >
                  Book a free strategy call →
                </a>
                <p style={{ 
                  marginTop: '16px', 
                  fontSize: '13px', 
                  lineHeight: 1.5, 
                  color: '#FFFFFF', 
                  textAlign: 'center',
                  fontWeight: 500,
                  letterSpacing: '0.03em',
                  opacity: 0.8,
                  maxWidth: '240px',
                  margin: '16px auto 0 auto'
                }}>
                  You'll leave the call with a roadmap, ready to go.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
