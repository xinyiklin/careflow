type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-semibold tracking-tight text-cf-text">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-cf-text-muted">{subtitle}</p>
      )}
    </div>
  );
}
