export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  name,
  autoComplete,
  error,
  className = ''
}) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="mb-1 text-sm text-muted">{label}</div>}
      <input
        className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {error && <div className="mt-1 text-xs text-danger">{error}</div>}
    </label>
  );
}
