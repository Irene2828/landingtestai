type UrlFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string | null;
};

const URL_HELP_TEXT = "Enter full URL (e.g. https://linear.app)";

export function UrlField({ value, onChange, onBlur, error }: UrlFieldProps) {
  const describedBy = [error ? "url-input-error" : null, "url-input-help"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="setup-block">
      <label className="setup-label" htmlFor="url-input">
        Paste your landing page URL
      </label>

      <div className={`input-shell${error ? " input-shell-error" : ""}`}>
        <span className="input-icon material-symbols-outlined" aria-hidden="true">
          link
        </span>
        <input
          id="url-input"
          className="setup-input"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder="https://your-saas-product.com"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
        />
      </div>
      <p id="url-input-help" className="setup-hint">
        {URL_HELP_TEXT}
      </p>
      {error ? (
        <p id="url-input-error" className="setup-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
