"use client";

import { Search, ChevronDown } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { UrlField } from "./UrlField";

const URL_ERROR_MESSAGE = "Enter a valid URL (e.g. https://example.com)";

function normalizeUrlInput(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue;
  return `https://${trimmedValue}`;
}

function isValidNormalizedUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

const BUSINESS_TYPES = [
  "Agency / Creative Studio",
  "Professional Services",
  "Local Service Business",
  "eCommerce",
  "B2B SaaS",
  "Other"
];

const PRIMARY_GOALS = [
  "Get more enquiries",
  "Book calls or demos",
  "Drive sales",
  "Build brand awareness"
];

type AnalysisSetupFormProps = {
  isAnalyzing?: boolean;
  onStartAnalysis?: (url: string, businessType: string, goal: string) => void;
  onCancelAnalysis?: () => void;
  onValidationChange?: (isValid: boolean) => void;
  id?: string;
  disabled?: boolean;
  urlError?: string | null;
};

export function AnalysisSetupForm({ isAnalyzing = false, onStartAnalysis, onCancelAnalysis, onValidationChange, id, disabled = false, urlError: propUrlError }: AnalysisSetupFormProps) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  
  const [businessType, setBusinessType] = useState("");
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);
  const businessDropdownRef = useRef<HTMLDivElement>(null);
  
  const [goal, setGoal] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false);
  const goalDropdownRef = useRef<HTMLDivElement>(null);

  const finalBusinessType = businessType === "Other" ? customBusinessType : businessType;
  const finalGoal = goal === "Other" ? customGoal : goal;

  const canSubmit = useMemo(() => {
    const hasUrl = url.trim().length > 0;
    const hasBusiness = businessType === "Other" ? customBusinessType.trim().length > 0 : businessType.trim().length > 0;
    const hasGoal = goal === "Other" ? customGoal.trim().length > 0 : goal.trim().length > 0;
    return hasUrl && hasBusiness && hasGoal;
  }, [url, businessType, customBusinessType, goal, customGoal]);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(canSubmit);
    }
  }, [canSubmit, onValidationChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (businessDropdownRef.current && !businessDropdownRef.current.contains(event.target as Node)) {
        setIsBusinessDropdownOpen(false);
      }
      if (goalDropdownRef.current && !goalDropdownRef.current.contains(event.target as Node)) {
        setIsGoalDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleUrlChange(nextUrl: string) {
    setUrl(nextUrl);
    if (urlError) setUrlError(null);
  }

  function handleUrlBlur() {
    const normalizedUrl = normalizeUrlInput(url);
    if (normalizedUrl !== url) setUrl(normalizedUrl);
    if (!normalizedUrl) {
      setUrlError(null);
      return;
    }
    setUrlError(isValidNormalizedUrl(normalizedUrl) ? null : URL_ERROR_MESSAGE);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isAnalyzing || disabled) return;

    const normalizedUrl = normalizeUrlInput(url);
    if (normalizedUrl !== url) setUrl(normalizedUrl);
    if (!isValidNormalizedUrl(normalizedUrl)) {
      setUrlError(URL_ERROR_MESSAGE);
      return;
    }

    if (onStartAnalysis) {
      onStartAnalysis(normalizedUrl, finalBusinessType, finalGoal);
    }
  }

  const dropdownStyle = (isOpen: boolean, isSelected: boolean) => ({
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    color: disabled ? '#9CA3AF' : (isSelected ? '#0D0D0D' : '#6B6B6B'),
    background: disabled ? '#F3F4F6' : '#FFFFFF',
    border: `1px solid ${disabled ? '#E5E7EB' : (isOpen ? '#0057FF' : '#EBEBEB')}`,
    borderRadius: '10px',
    cursor: (isAnalyzing || disabled) ? 'not-allowed' : 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: (isOpen && !disabled) ? '0 0 0 3px rgba(0,87,255,0.08)' : 'none',
    transition: 'all 0.2s ease'
  });

  const menuStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    background: '#FFFFFF',
    border: '1px solid #EBEBEB',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    zIndex: 100,
    maxHeight: '220px',
    overflowY: 'auto' as const,
    scrollbarWidth: 'thin' as const
  };

  const otherInputStyle = {
    width: '100%',
    marginTop: '6px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #EBEBEB',
    borderRadius: '8px',
    background: disabled ? '#F3F4F6' : '#F9FAFB',
    color: disabled ? '#9CA3AF' : '#0D0D0D',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'text'
  };

  return (
    <form 
      id={id}
      className="setup-card" 
      onSubmit={handleSubmit} 
      noValidate
      style={{ 
        opacity: isAnalyzing ? 0.5 : 1, 
        pointerEvents: isAnalyzing ? 'none' : 'auto',
        transition: 'opacity 0.3s ease',
        background: 'transparent',
        padding: '0',
        border: 'none',
        boxShadow: 'none',
        marginTop: '8px'
      }}
    >
      {/* URL Field */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0D0D0D', marginBottom: '2px' }}>
          Website URL
        </label>
        <UrlField
          value={url}
          onChange={handleUrlChange}
          onBlur={handleUrlBlur}
          error={urlError || propUrlError}
          disabled={disabled}
        />
      </div>
      
      {/* Business Type Dropdown */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0D0D0D', marginBottom: '2px' }}>
          Business type
        </label>
        <div ref={businessDropdownRef} style={{ position: 'relative' }}>
          <div 
            onClick={() => !isAnalyzing && !disabled && setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
            style={dropdownStyle(isBusinessDropdownOpen, !!businessType)}
          >
            {businessType || "Select business type"}
            <ChevronDown size={18} color="#6B6B6B" style={{ transform: isBusinessDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {isBusinessDropdownOpen && (
            <div style={menuStyle}>
              {BUSINESS_TYPES.map(type => (
                <div 
                  key={type}
                  onClick={() => {
                    setBusinessType(type);
                    setIsBusinessDropdownOpen(false);
                    if (type !== "Other") setCustomBusinessType("");
                  }}
                  style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '15px', color: '#0D0D0D', background: businessType === type ? '#F0F5FF' : '#FFFFFF' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F5FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = businessType === type ? '#F0F5FF' : '#FFFFFF')}
                >
                  {type}
                </div>
              ))}
              <div 
                onClick={() => {
                  setBusinessType("Other");
                  setIsBusinessDropdownOpen(false);
                }}
                style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '15px', color: '#0D0D0D', background: businessType === "Other" ? '#F0F5FF' : '#FFFFFF', borderTop: '1px solid #F0F0F0' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F5FF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = businessType === "Other" ? '#F0F5FF' : '#FFFFFF')}
              >
                Other
              </div>
            </div>
          )}
        </div>
        {businessType === "Other" && (
          <input 
            placeholder="Specify business type..." 
            style={otherInputStyle}
            value={customBusinessType}
            onChange={(e) => setCustomBusinessType(e.target.value)}
            disabled={disabled}
            autoFocus
          />
        )}
      </div>

      {/* Goal Dropdown */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0D0D0D', marginBottom: '2px' }}>
          Primary goal
        </label>
        <div ref={goalDropdownRef} style={{ position: 'relative' }}>
          <div 
            onClick={() => !isAnalyzing && !disabled && setIsGoalDropdownOpen(!isGoalDropdownOpen)}
            style={dropdownStyle(isGoalDropdownOpen, !!goal)}
          >
            {goal || "Select primary goal"}
            <ChevronDown size={18} color="#6B6B6B" style={{ transform: isGoalDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {isGoalDropdownOpen && (
            <div style={menuStyle}>
              {PRIMARY_GOALS.map(g => (
                <div 
                  key={g}
                  onClick={() => {
                    setGoal(g);
                    setIsGoalDropdownOpen(false);
                    if (g !== "Other") setCustomGoal("");
                  }}
                  style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '15px', color: '#0D0D0D', background: goal === g ? '#F0F5FF' : '#FFFFFF' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F5FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = goal === g ? '#F0F5FF' : '#FFFFFF')}
                >
                  {g}
                </div>
              ))}
              <div 
                onClick={() => {
                  setGoal("Other");
                  setIsGoalDropdownOpen(false);
                }}
                style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '15px', color: '#0D0D0D', background: goal === "Other" ? '#F0F5FF' : '#FFFFFF', borderTop: '1px solid #F0F0F0' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F5FF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = goal === "Other" ? '#F0F5FF' : '#FFFFFF')}
              >
                Other
              </div>
            </div>
          )}
        </div>
        {goal === "Other" && (
          <input 
            placeholder="Describe your goal..." 
            style={otherInputStyle}
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            disabled={disabled}
            autoFocus
          />
        )}
      </div>
    </form>
  );
}
