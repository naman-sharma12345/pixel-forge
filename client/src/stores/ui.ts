import { create } from 'zustand'

interface UiState {
  cartDrawerOpen: boolean
  commandPaletteOpen: boolean
  mobileNavOpen: boolean
  becomeCreatorOpen: boolean
  setCartDrawerOpen: (v: boolean) => void
  setCommandPaletteOpen: (v: boolean) => void
  setMobileNavOpen: (v: boolean) => void
  setBecomeCreatorOpen: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  cartDrawerOpen: false,
  commandPaletteOpen: false,
  mobileNavOpen: false,
  becomeCreatorOpen: false,
  setCartDrawerOpen: (v) => set({ cartDrawerOpen: v }),
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  setBecomeCreatorOpen: (v) => set({ becomeCreatorOpen: v }),
}))
