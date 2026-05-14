export default function Button({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-600/40 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base'
  };

  const variants = {
    primary: 'bg-brand-600 text-onBrand hover:bg-brand-700',
    secondary: 'bg-text/5 text-text hover:bg-text/10',
    ghost: 'bg-transparent text-text hover:bg-text/5',
    danger: 'bg-danger text-white hover:bg-danger/90'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className}`}
    >
      {children}
    </button>
  );
}
