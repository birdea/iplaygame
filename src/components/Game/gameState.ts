import type { Entity, GroundItem, Effect } from '../../types';
import { PLAYER_WIDTH, PLAYER_HEIGHT, INVINCIBILITY_DURATION, SHIELD_DURATION } from '../../constants';
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
    effects: Effect[];

    // Camera & physics
    cameraX: number;
    onGround: boolean;

    // Boss
    bossActive: boolean;
    bossTactics: BossTactics;

    // Timing / debounce
    invincibleUntil: number;
    shieldUntil: number;
    lastShootTime: number;
    lastEscTime: number;
    lastSwingTime: number; // Club swing animation
    lastShieldTime: number;
    lastMegaSwingTime: number; // Mega flail throw

    // Skill Charging
    aChargeStart: number;
    aCharged: boolean;

    // Game flow
    gameActive: boolean;

    // Authoritative gameplay values (synced TO Zustand for React HUD)
    hp: number;
    score: number;
    ammo: number;
    shields: number;
    powerups: { bigBullet: number; fastRun: number };
    isPaused: boolean;
    stage: number;

    // Visual / Feedback state
    lastDamageTime: number;
    lastBlockHitSwingTime: number; // To limit to 1 block hit per swing
    bossWarning: boolean;
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
            facing: 'right',
        },
        entities: [],
        bullets: [],
        groundItems: [],
        effects: [],
        cameraX: 0,
        onGround: false,
        bossActive: false,
        bossTactics: createBossTactics(),
        invincibleUntil: 0,
        shieldUntil: 0,
        lastShootTime: 0,
        lastEscTime: 0,
        lastSwingTime: 0,
        lastShieldTime: 0,
        lastMegaSwingTime: 0,
        aChargeStart: 0,
        aCharged: false,
        gameActive: true,
        hp: 3,
        score: 0,
        ammo: 0,
        shields: 0,
        powerups: { bigBullet: 0, fastRun: 0 },
        isPaused: false,
        stage,
        lastDamageTime: 0,
        lastBlockHitSwingTime: 0,
        bossWarning: false,
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
    addAmmo: (amount: number) => void;
    addShields: (amount: number) => void;
    useShield: () => boolean;
    activatePowerup: (type: 'bigBullet' | 'fastRun', duration: number) => void;
    togglePaused: (paused?: boolean) => void;
}

export function createGameActions(
    gs: GameLoopState,
    syncFn: () => void,
): GameActions {
    return {
        takeDamage(amount: number = 1): boolean {
            const now = Date.now();
            if (now < gs.invincibleUntil || now < gs.shieldUntil) return false;
            gs.hp -= amount;
            gs.invincibleUntil = now + INVINCIBILITY_DURATION;
            gs.lastDamageTime = now;
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
        addAmmo(amount: number): void {
            gs.ammo += amount;
            syncFn();
        },
        addShields(amount: number): void {
            gs.shields += amount;
            syncFn();
        },
        useShield(): boolean {
            const now = Date.now();
            if (gs.shields > 0 && now > gs.shieldUntil) {
                gs.shields--;
                gs.shieldUntil = now + SHIELD_DURATION;
                syncFn();
                return true;
            }
            return false;
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
