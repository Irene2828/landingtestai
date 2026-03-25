type UrlFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function UrlField({ value, onChange }: UrlFieldProps) {
  return (
    <div className="setup-block">
      <label className="setup-label" htmlFor="url-input">
        Target Landing Page URL
      </label>

      <div className="input-shell">
        <span className="input-icon material-symbols-outlined" aria-hidden="true">
          link
        </span>
        <input
          id="url-input"
          className="setup-input"
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://example.com"
          required
        />
      </div>
    </div>
  );
}
