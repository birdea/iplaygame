import type { Entity, GroundItem } from '../../types';
import { PLAYER_WIDTH, PLAYER_HEIGHT, INVINCIBILITY_DURATION } from '../../constants';
import type { BossTactics } from './bossAI';
import { createBossTactics } from './bossAI';

// ---------------------------------------------------------------------------
// GameLoopState: Single source of truth for all mutable game-loop state
// ---------------------------------------------------------------------------
export interface GameLoopState {
    // Player
    player: Entity;

    // Entity collections
    entities: Entity[];
    bullets: Entity[];
    groundItems: GroundItem[];

    // Camera & physics
    cameraX: number;
    onGround: boolean;

    // Boss
    bossActive: boolean;
    bossTactics: BossTactics;

    // Timing / debounce
    invincibleUntil: number;
    lastShootTime: number;
    lastEscTime: number;
    lastSwingTime: number; // Club swing animation

    // Game flow
    gameActive: boolean;

    // Authoritative gameplay values (synced TO Zustand for React HUD)
    hp: number;
    score: number;
    powerups: { bigBullet: number; fastRun: number };
    isPaused: boolean;
    stage: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createInitialGameState(stage: number = 1): GameLoopState {
    return {
        player: {
            id: 'player',
            pos: { x: 100, y: 300 },
            vel: { x: 0, y: 0 },
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            type: 'player',
        },
        entities: [],
        bullets: [],
        groundItems: [],
        cameraX: 0,
        onGround: false,
        bossActive: false,
        bossTactics: createBossTactics(),
        invincibleUntil: 0,
        lastShootTime: 0,
        lastEscTime: 0,
        lastSwingTime: 0,
        gameActive: true,
        hp: 3,
        score: 0,
        powerups: { bigBullet: 0, fastRun: 0 },
        isPaused: false,
        stage,
    };
}

// ---------------------------------------------------------------------------
// Actions proxy – mutates GameLoopState directly, then syncs to Zustand.
// Eliminates the stale-statsRef problem because reads/writes are on the
// same object within the same synchronous frame.
// ---------------------------------------------------------------------------
export interface GameActions {
    takeDamage: (amount?: number) => boolean;
    addScore: (points: number) => void;
    setHP: (hp: number) => void;
    activatePowerup: (type: 'bigBullet' | 'fastRun', duration: number) => void;
    togglePaused: (paused?: boolean) => void;
}

export function createGameActions(
    gs: GameLoopState,
    syncFn: () => void,
): GameActions {
    return {
        takeDamage(amount: number = 1): boolean {
            if (Date.now() < gs.invincibleUntil) return false;
            gs.hp -= amount;
            gs.invincibleUntil = Date.now() + INVINCIBILITY_DURATION;
            syncFn();
            return true;
        },
        addScore(points: number): void {
            gs.score += points;
            syncFn();
        },
        setHP(hp: number): void {
            gs.hp = hp;
            syncFn();
        },
        activatePowerup(type: 'bigBullet' | 'fastRun', duration: number): void {
            gs.powerups[type] = Date.now() + duration;
            syncFn();
        },
        togglePaused(paused?: boolean): void {
            gs.isPaused = paused !== undefined ? paused : !gs.isPaused;
            syncFn();
        },
    };
}
