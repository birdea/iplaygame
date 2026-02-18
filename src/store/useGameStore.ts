import { create } from 'zustand';

export interface GameState {
  screen: 'menu' | 'settings' | 'game' | 'gameover' | 'victory';
  faces: string[];
  selectedFaceIndex: number;
  stage: number;
  score: number;
  hp: number;
  powerups: {
    bigBullet: number; // timestamp until expiration
    fastRun: number;   // timestamp until expiration
  };

  // Actions
  setScreen: (screen: 'menu' | 'settings' | 'game' | 'gameover' | 'victory') => void;
  addFace: (face: string) => void;
  selectFace: (index: number) => void;
  resetGame: () => void;
  nextStage: () => void;
  setHP: (hp: number) => void;
  addScore: (points: number) => void;
  activatePowerup: (type: 'bigBullet' | 'fastRun', duration: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'menu',
  faces: [],
  selectedFaceIndex: 0,
  stage: 1,
  score: 0,
  hp: 3,
  powerups: {
    bigBullet: 0,
    fastRun: 0,
  },

  setScreen: (screen) => set({ screen }),

  addFace: (face) => set((state) => {
    if (state.faces.length >= 10) {
      const newFaces = [...state.faces.slice(1), face];
      return { faces: newFaces };
    }
    return { faces: [...state.faces, face] };
  }),

  selectFace: (index) => set({ selectedFaceIndex: index }),

  resetGame: () => set({
    stage: 1,
    score: 0,
    hp: 3,
    screen: 'game',
    powerups: { bigBullet: 0, fastRun: 0 }
  }),

  nextStage: () => set((state) => ({ stage: Math.min(state.stage + 1, 3) })),

  setHP: (hp) => set({ hp }),

  addScore: (points) => set((state) => ({ score: state.score + points })),

  activatePowerup: (type, duration) => set((state) => ({
    powerups: {
      ...state.powerups,
      [type]: Date.now() + duration
    }
  })),
}));
