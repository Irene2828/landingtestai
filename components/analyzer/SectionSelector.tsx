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
    <fieldset className="setup-block">
      <legend className="setup-label">Sections to Analyze</legend>

      <div className="section-grid">
        {options.map((option) => {
          const checked = selected.includes(option.key);

          return (
            <label key={option.key} className="section-option">
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
    </fieldset>
  );
}
