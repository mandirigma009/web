// src/utils/actionStyles.ts
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSave, FaCalendarCheck } from "react-icons/fa";
import type { JSX } from "react";
import "../styles/App.css";

export type ActionKey =
  | "approve"
  | "edit"
  | "save"
  | "cancel"
  | "delete"
  | "reject"
  | "book";

export interface ActionStyle {
  label: string;
  className: string;
  icon?: JSX.Element;
}

export const ACTION_STYLES: Record<ActionKey, ActionStyle> = {
  approve: {
    label: "Approve",
    className: "btn-action btn-approve",
    icon: <FaCheck />,
  },
  edit: {
    label: "Edit",
    className: "btn-action btn-edit",
    icon: <FaEdit />,
  },
  save: {
    label: "Save",
    className: "btn-action btn-save",
    icon: <FaSave />,
  },
  cancel: {
    label: "Cancel",
    className: "btn-action btn-cancel bg-red-200 hover:bg-red-300 ",
    icon: <FaTimes />,
  },
  delete: {
    label: "Delete",
    className: "btn-action btn-delete bg-red-600 hover:bg-red-700",
    icon: <FaTrash />,
  },
  reject: {
    label: "Reject",
    className: "btn-action btn-reject",
    icon: <FaTimes />,
  },
  book: {
    label: "Book",
    className: "btn-action btn-book",
    icon: <FaCalendarCheck />,
  },
};
