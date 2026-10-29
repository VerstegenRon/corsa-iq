"use client";

import { createContext, useContext, type ReactNode } from "react";

// Whether the signed-in member may change the current garage's data. Only viewers may not; the
// database refuses their writes as well (row-level security), this only keeps the buttons away.

const CanEditContext = createContext(true);

export function EditAccessProvider({ canEdit, children }: { canEdit: boolean; children: ReactNode }) {
  return <CanEditContext value={canEdit}>{children}</CanEditContext>;
}

export function useCanEdit() {
  return useContext(CanEditContext);
}

/** Renders its children only for members who may edit; viewers see `fallback` (nothing by default). */
export function EditOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useCanEdit() ? children : fallback;
}
