import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LastUpdateStore {
  lastUpdate: number | null
  setLastUpdate: (timestamp: number | null) => void
  getFormattedDate: () => string
}

export const useLastUpdateStore = create<LastUpdateStore>()(
  persist(
    (set, get) => ({
      lastUpdate: null,
      
      setLastUpdate: (timestamp: number | null) => {
        set({ lastUpdate: timestamp })
      },

      getFormattedDate: () => {
        const timestamp = get().lastUpdate
        if (!timestamp) return 'Nunca'

        const date = new Date(timestamp)
        return date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      },
    }),
    {
      name: 'last-update-storage',
    }
  )
)
