"use client";

import { useState } from "react";

/**
 * Manages the open/editing state for a single modal that toggles between
 * "create" and "edit" modes for the same entity type `T`.
 *
 * Pairs naturally with `FormModal` (`~/components/ui/form-modal`) and
 * `toastMutationOptions` (`~/lib/mutation-utils`): call `close()` from the
 * mutation's `onSuccess`.
 */
export function useCrudModal<T>() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  function openCreate() {
    setEditing(null);
    setIsOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setEditing(null);
  }

  return { isOpen, editing, openCreate, openEdit, close };
}
