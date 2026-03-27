type ScreenshotPlaceholderProps = {
  label: string;
  sourceTone: "text" | "partial" | "visual";
};

function getPlaceholderNote(sourceTone: ScreenshotPlaceholderProps["sourceTone"]) {
  switch (sourceTone) {
    case "text":
      return "Text evidence grounded";
    case "partial":
      return "Text + manual check";
    case "visual":
      return "Visual check recommended";
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
