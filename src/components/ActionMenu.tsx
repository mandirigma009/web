// src/components/ActionMenu

import { ACTION_STYLES, type ActionKey } from "../../src/utils/actionStyles";
import "../styles/App.css";

interface ActionItem {
  key: ActionKey;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

interface ActionMenuProps {
  actions: ActionItem[];
}

export default function ActionMenu({ actions }: ActionMenuProps) {
  if (actions.length === 1) {
    const a = actions[0];
    const style = ACTION_STYLES[a.key];

    return (
      <button
        className={style.className}
        onClick={a.onClick}
        disabled={a.disabled}
        title={a.title || style.label}
      >
        {style.icon}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {actions.map((a) => {
        const style = ACTION_STYLES[a.key];
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
      })}
    </div>
  );
}
