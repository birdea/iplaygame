import { create } from 'zustand';

export interface GameState {
  screen: 'menu' | 'settings' | 'game' | 'gameover' | 'victory';
  faces: string[];
  selectedFaceIndex: number;
  stage: number;
  score: number;
  hp: number;
  
  // Actions
  setScreen: (screen: 'menu' | 'settings' | 'game' | 'gameover' | 'victory') => void;
  addFace: (face: string) => void;
  selectFace: (index: number) => void;
  resetGame: () => void;
  nextStage: () => void;
  setHP: (hp: number) => void;
  addScore: (points: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'menu',
  faces: [],
  selectedFaceIndex: 0,
  stage: 1,
  score: 0,
  hp: 3,

  setScreen: (screen) => set({ screen }),
  
  addFace: (face) => set((state) => {
    if (state.faces.length >= 10) {
      const newFaces = [...state.faces.slice(1), face];
      return { faces: newFaces };
    }
    return { faces: [...state.faces, face] };
  }),

  selectFace: (index) => set({ selectedFaceIndex: index }),

  resetGame: () => set({ stage: 1, score: 0, hp: 3, screen: 'game' }),

  nextStage: () => set((state) => ({ stage: Math.min(state.stage + 1, 3) })),

  setHP: (hp) => set({ hp }),

  addScore: (points) => set((state) => ({ score: state.score + points })),
}));
