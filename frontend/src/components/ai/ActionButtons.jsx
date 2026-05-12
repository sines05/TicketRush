import React from 'react';
import { Button } from "@/components/ui/button";

const ActionButtons = ({ data, onAction }) => {
  const { actions } = data;

  if (!actions || !Array.isArray(actions)) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="secondary"
          size="sm"
          className="text-xs rounded-full h-8 px-3 bg-primary/10 hover:bg-primary/20 text-primary border-none"
          onClick={() => onAction(action.label, action.value)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default ActionButtons;
