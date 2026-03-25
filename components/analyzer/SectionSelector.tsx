import type { AnalysisSectionKey, SetupSectionOption } from "@/lib/types";

type SectionSelectorProps = {
  options: SetupSectionOption[];
  selected: AnalysisSectionKey[];
  onToggle: (section: AnalysisSectionKey) => void;
};

export function SectionSelector({
  options,
  selected,
  onToggle
}: SectionSelectorProps) {
  return (
    <div
      className="setup-block"
      role="group"
      aria-labelledby="sections-to-analyze-label"
    >
      <div id="sections-to-analyze-label" className="setup-label">
        Sections to Analyze
      </div>

      <div className="section-grid">
        {options.map((option) => {
          const checked = selected.includes(option.key);

          return (
            <label
              key={option.key}
              className={`section-option ${checked ? "section-option-selected" : ""}`.trim()}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option.key)}
              />
              <span className="section-option-indicator" aria-hidden="true" />
              <span className="section-option-label">{option.label}</span>
            </label>
          );
        })}
      </div>

      <p className="setup-hint setup-hint-centered">
        Choose the parts of the page you want the analysis to compare.
      </p>
    </div>
  );
}
