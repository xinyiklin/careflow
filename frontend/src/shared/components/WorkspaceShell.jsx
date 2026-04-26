export default function WorkspaceShell({
  children,
  className = "",
  panelClassName = "",
  beforePanel = null,
  afterPanel = null,
}) {
  return (
    <div
      className={[
        "cf-workspace-shell flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden px-4 pb-4 sm:px-5 lg:px-6 xl:px-7",
        panelClassName,
        className,
      ].join(" ")}
    >
      {beforePanel}
      {children}
      {afterPanel}
    </div>
  );
}
