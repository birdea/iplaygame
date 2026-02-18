import type { Entity } from '../core/types';
import { PLAYER_WIDTH, PLAYER_HEIGHT, INVINCIBILITY_DURATION } from '../core/constants';
import type { BossTactics } from './bossAI';
import { createBossTactics } from './bossAI';

export interface GameLoopState {
    // Entities
    player: Entity;
    entities: Entity[];
    bullets: Entity[];

    // Camera & physics
    cameraX: number;
    onGround: boolean;

    // Boss
    bossActive: boolean;
    bossTactics: BossTactics;

    // Game stats
    invincibleUntil: number;
    lastShootTime: number;
    lastEscTime: number;
    gameActive: boolean;
    isPaused: boolean;
    hp: number;
    score: number;
    stage: number;

    // Powerups
    powerups: {
        bigBullet: number;
        fastRun: number;
    };
}

export function createInitialGameState(stage: number): GameLoopState {
    return {
        player: {
            id: 'player',
            type: 'player',
            pos: { x: 100, y: 300 },
            vel: { x: 0, y: 0 },
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            hp: 3,
        } as Entity,
        entities: [],
        bullets: [],
        cameraX: 0,
        onGround: false,
        bossActive: false,
        bossTactics: createBossTactics(),
        invincibleUntil: 0,
        lastShootTime: 0,
        lastEscTime: 0,
        gameActive: true,
        isPaused: false,
        hp: 3,
        score: 0,
        stage: stage,
        powerups: {
            bigBullet: 0,
            fastRun: 0,
        },
    };
}

export interface GameActions {
    takeDamage: (amount: number) => boolean;
    addScore: (amount: number) => void;
    setHP: (hp: number) => void;
    activatePowerup: (type: 'bigBullet' | 'fastRun', duration: number) => void;
    togglePaused: (paused?: boolean) => void;
}

export function createGameActions(
    gs: GameLoopState,
    syncFn: () => void,
): GameActions {
    return {
        takeDamage: (amount) => {
            if (gs.invincibleUntil > Date.now()) return false;
            gs.hp -= amount;
            gs.invincibleUntil = Date.now() + INVINCIBILITY_DURATION;
            syncFn();
            return true;
        },
        addScore: (amount) => {
            gs.score += amount;
            syncFn();
        },
        setHP: (hp) => {
            gs.hp = hp;
            syncFn();
        },
        activatePowerup: (type, duration) => {
            gs.powerups[type] = Date.now() + duration;
            syncFn();
        },
        togglePaused: (paused) => {
            gs.isPaused = paused !== undefined ? paused : !gs.isPaused;
            syncFn();
        }
    };
}
