import { create } from 'zustand';
import { GAME_STRATEGY } from '../components/Game/GameStrategy';

export type WeaponType = 'sword' | 'club';

export interface GameState {
  // UI navigation (authoritative here)
  screen: 'menu' | 'settings' | 'game' | 'gameover' | 'victory';
  faces: string[];
  selectedFaceIndex: number;
  selectedWeapon: WeaponType;

  // Mirrored from game loop (read-only for React HUD consumption)
  hp: number;
  score: number;
  powerups: { bigBullet: number; fastRun: number };
  isPaused: boolean;
  stage: number;
  aCharged: boolean;
  ammo: number;
  shields: number;

  // Actions
  setScreen: (screen: GameState['screen']) => void;
  addFace: (face: string) => void;
  selectFace: (index: number) => void;
  setWeapon: (weapon: WeaponType) => void;
  resetGame: () => void;
  nextStage: () => void;
  syncFromLoop: (data: {
    hp: number;
    score: number;
    powerups: { bigBullet: number; fastRun: number };
    isPaused: boolean;
    stage: number;
    aCharged: boolean;
    ammo: number;
    shields: number;
  }) => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'menu',
  faces: [],
  selectedFaceIndex: 0,
  selectedWeapon: 'sword',
  stage: 1,
  score: 0,
  hp: 3,
  isPaused: false,
  aCharged: false,
  powerups: {
    bigBullet: 0,
    fastRun: 0,
  },
  ammo: 0,
  shields: 0,

  setScreen: (screen) => set({ screen }),

  addFace: (face) => set((state) => {
    if (state.faces.length >= 10) {
      const newFaces = [...state.faces.slice(1), face];
      return { faces: newFaces };
    }
    return { faces: [...state.faces, face] };
  }),

  selectFace: (index) => set({ selectedFaceIndex: index }),

  setWeapon: (weapon) => set({ selectedWeapon: weapon }),

  resetGame: () => set({
    stage: 1,
    score: 0,
    hp: 3,
    screen: 'game',
    isPaused: false,
    powerups: { bigBullet: 0, fastRun: 0 },
    ammo: 0,
    shields: 0,
  }),

  nextStage: () => set((state) => ({ stage: Math.min(state.stage + 1, GAME_STRATEGY.STAGE.TOTAL_STAGES) })),

  syncFromLoop: (data) => set(data),
}));
