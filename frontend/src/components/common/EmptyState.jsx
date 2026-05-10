import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchX, Inbox, Ticket } from 'lucide-react';

const icons = {
  search: SearchX,
  inbox: Inbox,
  ticket: Ticket,
};

export default function EmptyState({ 
  title = "Không có dữ liệu", 
  description = "Chúng tôi không tìm thấy thông tin bạn yêu cầu.", 
  icon = "inbox",
  action,
  className
}) {
  const Icon = icons[icon] || Inbox;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center glass-surface rounded-2xl border-dashed border-2 border-muted-foreground/10 m-4",
      className
    )}>
      <div className="bg-muted/30 p-5 rounded-2xl mb-6">
        <Icon className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <h3 className="text-xl font-bold mb-2 tracking-tight">{title}</h3>
      <p className="text-muted-foreground mb-8 max-w-xs mx-auto text-sm leading-relaxed">
        {description}
      </p>
      {action && (
        <Button 
          onClick={action.onClick}
          className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
