type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-cf-text-muted">
      {message}
    </div>
  );
}
