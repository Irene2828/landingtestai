type ScreenshotPlaceholderProps = {
  label: string;
};

export function ScreenshotPlaceholder({
  label
}: ScreenshotPlaceholderProps) {
  return (
    <div className="screenshot-placeholder" aria-hidden="true">
      <div className="screenshot-placeholder-inner">
        <span className="screenshot-placeholder-label">Screenshot</span>
        <strong>{label}</strong>
      </div>
    </div>
  );
}
