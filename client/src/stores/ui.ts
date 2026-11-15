import { create } from 'zustand'

interface UiState {
  cartDrawerOpen: boolean
  cartDrawerHovered: boolean
  /** true while the drawer is only peeking after an add-to-cart */
  cartDrawerPeek: boolean
  setCartDrawerPeek: (v: boolean) => void
  commandPaletteOpen: boolean
  mobileNavOpen: boolean
  becomeCreatorOpen: boolean
  setCartDrawerOpen: (v: boolean) => void
  setCartDrawerHovered: (v: boolean) => void
  setCommandPaletteOpen: (v: boolean) => void
  setMobileNavOpen: (v: boolean) => void
  setBecomeCreatorOpen: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  cartDrawerOpen: false,
  cartDrawerHovered: false,
  cartDrawerPeek: false,
  setCartDrawerPeek: (v) => set({ cartDrawerPeek: v }),
  commandPaletteOpen: false,
  mobileNavOpen: false,
  becomeCreatorOpen: false,
  setCartDrawerOpen: (v) => set({ cartDrawerOpen: v, cartDrawerPeek: false }),
  setCartDrawerHovered: (v) => set({ cartDrawerHovered: v }),
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  setBecomeCreatorOpen: (v) => set({ becomeCreatorOpen: v }),
}))
