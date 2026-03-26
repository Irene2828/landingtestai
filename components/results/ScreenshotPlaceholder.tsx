type ScreenshotPlaceholderProps = {
  label: string;
};

export function ScreenshotPlaceholder({
  label: _label
}: ScreenshotPlaceholderProps) {
  return (
    <div className="screenshot-placeholder" aria-hidden="true">
      <div className="screenshot-placeholder-inner">
        <span className="screenshot-placeholder-note">Visual insight coming</span>
      </div>
    </div>
  );
}
