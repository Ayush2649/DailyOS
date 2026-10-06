

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-12 border-y text-center" style={{ borderColor: 'var(--border-subtle)' }}>
      {/* Simple illustration */}
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4" style={{ color: 'var(--text-3)' }}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary mt-3 min-h-11 px-4 text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
