import { createContext, useContext } from "react";
import type { Transaction } from "@/lib/budget/model";

type EditorApi = {
  openCreate: () => void;
  openEdit: (tx: Transaction) => void;
};

export const EditorContext = createContext<EditorApi>({
  openCreate: () => {},
  openEdit: () => {},
});

export function useEditor() {
  return useContext(EditorContext);
}
