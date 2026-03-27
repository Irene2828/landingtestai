type ScreenshotPlaceholderProps = {
  label: string;
  sourceTone: "text" | "partial" | "visual";
};

function getPlaceholderNote(sourceTone: ScreenshotPlaceholderProps["sourceTone"]) {
  switch (sourceTone) {
    case "text":
      return "Visual proof slot coming in V2";
    case "partial":
      return "Text-led read. Visual proof in V2";
    case "visual":
      return "Manual visual check until V2";
  }
}

export function ScreenshotPlaceholder({
  label: _label,
  sourceTone
}: ScreenshotPlaceholderProps) {
  return (
    <div className="screenshot-placeholder" aria-hidden="true">
      <div className="screenshot-placeholder-inner">
        <span className="screenshot-placeholder-note">
          {getPlaceholderNote(sourceTone)}
        </span>
      </div>
    </div>
  );
}
