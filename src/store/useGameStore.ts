import { create } from 'zustand';
import type { Entity } from '../types';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../constants';

export interface BossTactics {
  lastAttackTime: number;
  state: 'idle' | 'punch' | 'fire';
  attackDuration: number;
}

export interface GameState {
  screen: 'menu' | 'settings' | 'game' | 'gameover' | 'victory';
  faces: string[];
  selectedFaceIndex: number;
  stage: number;
  score: number;
  hp: number;
  isPaused: boolean;
  powerups: {
    bigBullet: number; // timestamp until expiration
    fastRun: number;   // timestamp until expiration
  };

  // Unified Game States
  player: Entity;
  entities: Entity[];
  bullets: Entity[];
  cameraX: number;
  bossActive: boolean;
  invincibleUntil: number;
  onGround: boolean;
  bossTactics: BossTactics;

  // Actions
  setScreen: (screen: 'menu' | 'settings' | 'game' | 'gameover' | 'victory') => void;
  togglePaused: (paused?: boolean) => void;
  setPaused: (paused: boolean) => void;
  addFace: (face: string) => void;
  selectFace: (index: number) => void;
  resetGame: () => void;
  nextStage: () => void;
  setHP: (hp: number) => void;
  addScore: (points: number) => void;
  activatePowerup: (type: 'bigBullet' | 'fastRun', duration: number) => void;

  // Game Logic Actions
  setPlayer: (player: Entity | ((prev: Entity) => Entity)) => void;
  setEntities: (entities: Entity[] | ((prev: Entity[]) => Entity[])) => void;
  setBullets: (bullets: Entity[] | ((prev: Entity[]) => Entity[])) => void;
  setCameraX: (x: number | ((prev: number) => number)) => void;
  setBossActive: (active: boolean) => void;
  updateBossTactics: (tactics: Partial<BossTactics>) => void;
  setInvincibleUntil: (time: number) => void;
  setOnGround: (onGround: boolean) => void;
  initializeStage: (entities: Entity[]) => void;
}

const initialPlayer: Entity = {
  id: 'player',
  pos: { x: 100, y: 300 },
  vel: { x: 0, y: 0 },
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  type: 'player'
};

const initialBossTactics: BossTactics = {
  lastAttackTime: 0,
  state: 'idle',
  attackDuration: 0
};

export const useGameStore = create<GameState>((set) => ({
  screen: 'menu',
  faces: [],
  selectedFaceIndex: 0,
  stage: 1,
  score: 0,
  hp: 3,
  isPaused: false,
  powerups: {
    bigBullet: 0,
    fastRun: 0,
  },

  // Initial Unified States
  player: initialPlayer,
  entities: [],
  bullets: [],
  cameraX: 0,
  bossActive: false,
  invincibleUntil: 0,
  onGround: false,
  bossTactics: initialBossTactics,

  setScreen: (screen) => set({ screen, isPaused: false }),

  togglePaused: (paused) => set((state) => ({
    isPaused: paused !== undefined ? paused : !state.isPaused
  })),

  setPaused: (isPaused) => set({ isPaused }),

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
    isPaused: false,
    powerups: { bigBullet: 0, fastRun: 0 },
    player: initialPlayer,
    entities: [],
    bullets: [],
    cameraX: 0,
    bossActive: false,
    invincibleUntil: 0,
    onGround: false,
    bossTactics: initialBossTactics,
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

  setPlayer: (player) => set((state) => ({
    player: typeof player === 'function' ? player(state.player) : player
  })),

  setEntities: (entities) => set((state) => ({
    entities: typeof entities === 'function' ? entities(state.entities) : entities
  })),

  setBullets: (bullets) => set((state) => ({
    bullets: typeof bullets === 'function' ? bullets(state.bullets) : bullets
  })),

  setCameraX: (cameraX) => set((state) => ({
    cameraX: typeof cameraX === 'function' ? cameraX(state.cameraX) : cameraX
  })),

  setBossActive: (bossActive) => set({ bossActive }),

  updateBossTactics: (tactics) => set((state) => ({
    bossTactics: { ...state.bossTactics, ...tactics }
  })),

  setInvincibleUntil: (invincibleUntil) => set({ invincibleUntil }),

  setOnGround: (onGround) => set({ onGround }),

  initializeStage: (entities) => set({
    entities,
    player: initialPlayer,
    cameraX: 0,
    bossActive: false,
    bullets: [],
    onGround: false,
    bossTactics: initialBossTactics,
    invincibleUntil: 0,
  }),
}));

