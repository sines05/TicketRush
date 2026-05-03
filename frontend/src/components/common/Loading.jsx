export default function Loading({ title = 'Đang xử lý...', subtitle }) {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-text/10 bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-text/10 border-t-brand-600" />
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {subtitle && <div className="mt-1 text-xs text-muted">{subtitle}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
