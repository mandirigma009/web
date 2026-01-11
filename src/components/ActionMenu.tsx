// src/components/ActionMenu.tsx

import { ACTION_STYLES, type ActionKey } from "../../src/utils/actionStyles";
import "../styles/App.css";

interface ActionItem {
  key: ActionKey | string; // <-- allow string but we'll validate
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

interface ActionMenuProps {
  actions: ActionItem[];
}

export default function ActionMenu({ actions }: ActionMenuProps) {
  const renderButton = (a: ActionItem) => {
    const style = ACTION_STYLES[a.key as ActionKey];

    if (!style) {
      console.error("Invalid ActionKey passed to ActionMenu:", a.key);
      return null; // skip invalid buttons
    }

    return (
      <button
        key={a.key}
        className={style.className}
        onClick={a.onClick}
        disabled={a.disabled}
        title={a.title || style.label}
      >
        {style.icon}
      </button>
    );
  };

  if (actions.length === 1) {
    return renderButton(actions[0]);
  }

  return <div style={{ display: "flex", gap: 6 }}>{actions.map(renderButton)}</div>;
}
