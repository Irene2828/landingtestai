import { Link2, X } from "lucide-react";
import { useState } from "react";

type UrlFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string | null;
  disabled?: boolean;
};

export function UrlField({ value, onChange, onBlur, error, disabled }: UrlFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const describedBy = [error ? "url-input-error" : null, "url-input-help"]
    .filter(Boolean)
    .join(" ");

  const borderColor = error ? '#E11D48' : isFocused ? '#0057FF' : '#EBEBEB';
  const boxShadow = error ? 'none' : isFocused ? '0 0 0 3px rgba(0,87,255,0.12)' : 'none';

  return (
    <div className="setup-block" style={{ marginBottom: '0px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Link2 
          size={20} 
          style={{ position: 'absolute', left: '16px', color: disabled ? '#9CA3AF' : '#6B6B6B', pointerEvents: 'none' }} 
          strokeWidth={1.7} 
          aria-hidden="true" 
        />
        <input
          id="url-input"
          disabled={disabled}
          style={{ 
            width: '100%', 
            padding: '16px 48px 16px 48px', // space for icon left, clear right
            fontSize: '16px', 
            color: disabled ? '#9CA3AF' : '#0D0D0D', 
            background: disabled ? '#F3F4F6' : '#FFFFFF', 
            border: `1px solid ${disabled ? '#E5E7EB' : borderColor}`, 
            borderRadius: '12px', 
            outline: 'none',
            boxShadow: disabled ? 'none' : boxShadow,
            transition: 'all 0.2s ease',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur();
          }}
          placeholder="https://example.com"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
        />
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              document.getElementById("url-input")?.focus();
            }}
            style={{ 
              position: 'absolute', 
              right: '16px', 
              color: '#AAAAAA', 
              background: 'none', 
              border: 'none', 
              padding: '4px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Clear URL"
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </div>
      
      {error ? (
        <p id="url-input-error" style={{ fontSize: '12px', color: '#E11D48', marginTop: '4px', marginBottom: '0', fontWeight: 500, lineHeight: 1.4 }} role="alert">
          {error}
        </p>
      ) : (
        <p id="url-input-help" style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px', marginBottom: '0' }}>
          Enter full URL (including https://) for accurate analysis.
        </p>
      )}
    </div>
  );
}
