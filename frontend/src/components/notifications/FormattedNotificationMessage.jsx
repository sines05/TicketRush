function renderInline(text) {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith('**')) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('__')) {
      parts.push(<span key={key} className="underline underline-offset-2">{token.slice(2, -2)}</span>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      parts.push(<code key={key} className="rounded bg-slate-900/10 px-1 py-0.5 text-[0.92em] dark:bg-white/10">{token.slice(1, -1)}</code>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function FormattedNotificationMessage({ message = '', className = '' }) {
  const lines = String(message).split(/\r?\n/);

  return (
    <div className={className}>
      {lines.map((line, index) => {
        const bulletMatch = line.match(/^\s*[-•]\s+(.+)/);
        const key = `${index}-${line}`;

        if (!line.trim()) {
          return <div key={key} className="h-2" />;
        }

        if (bulletMatch) {
          return (
            <div key={key} className="flex gap-2">
              <span className="mt-[0.58em] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
              <span>{renderInline(bulletMatch[1])}</span>
            </div>
          );
        }

        return <p key={key}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
