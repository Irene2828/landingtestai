type ScreenshotPlaceholderProps = {
  label: string;
  sourceTone: "text" | "partial" | "visual";
};

function getPlaceholderNote(sourceTone: ScreenshotPlaceholderProps["sourceTone"]) {
  switch (sourceTone) {
    case "text":
      return "Text-grounded read with visual proof deferred.";
    case "partial":
      return "Text-led read with partial visual context deferred.";
    case "visual":
      return "Manual visual check stays recommended until V2 ships.";
  }
}

export function ScreenshotPlaceholder({
  label: _label,
  sourceTone
}: ScreenshotPlaceholderProps) {
  return (
    <div className="screenshot-placeholder" aria-hidden="true">
      <div className="screenshot-placeholder-inner">
        <span className="screenshot-placeholder-badge">
          <span className="screenshot-placeholder-badge-icon" />
          Screenshot analysis in V2
        </span>
        <span className="screenshot-placeholder-note">
          {getPlaceholderNote(sourceTone)}
        </span>
      </div>
    </div>
  );
}
