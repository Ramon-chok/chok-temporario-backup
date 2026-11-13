import { create } from 'zustand'
import type { FilterState } from '@/types'

interface FilterStore extends FilterState {
  setSeller: (seller: string | null) => void
  setEquipe: (equipe: string | null) => void
  setGerencia: (gerencia: string | null) => void
  setImportId: (importId: string | null) => void
  clearFilters: () => void
}

const initialState: FilterState = {
  dateRange: { start: null, end: null },
  seller: null,
  city: null,
  equipe: null,
  gerencia: null,
  importId: null,
}

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,

  setSeller: (seller) => set({ seller }),
  setEquipe: (equipe) => set({ equipe }),
  setGerencia: (gerencia) => set({ gerencia }),
  setImportId: (importId) => set({ importId }),

  clearFilters: () => set(initialState),
}))
