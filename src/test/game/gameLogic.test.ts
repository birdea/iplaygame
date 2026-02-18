import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGame } from '../../components/game/gameLogic';
import type { GameLoopState, GameActions } from '../../components/game/gameState';
import { BOSS_TRIGGER_X } from '../../components/core/constants';

describe('gameLogic.ts', () => {
    let gs: GameLoopState;
    let actions: GameActions;
    let keys: { current: { [key: string]: boolean } };
    let gameActiveRef: { current: boolean };
    const onVictory = vi.fn();
    const onGameOver = vi.fn();

    beforeEach(() => {
        gs = {
            player: { pos: { x: 100, y: 100 }, vel: { x: 0, y: 0 }, width: 50, height: 50, type: 'player' },
            entities: [],
            bullets: [],
            cameraX: 0,
            onGround: false,
            bossActive: false,
            bossTactics: { state: 'idle', lastStateChange: 0, nextActionTime: 0 },
            invincibleUntil: 0,
            lastShootTime: 0,
            lastEscTime: 0,
            gameActive: true,
            hp: 3,
            score: 0,
            powerups: { bigBullet: 0, fastRun: 0 },
            isPaused: false,
            stage: 1,
        } as unknown as GameLoopState;

        actions = {
            takeDamage: vi.fn(),
            addScore: vi.fn(),
            setHP: vi.fn(),
            activatePowerup: vi.fn(),
            togglePaused: vi.fn(),
        };

        keys = { current: {} };
        gameActiveRef = { current: true };
        vi.clearAllMocks();
    });

    it('should not update if game is inactive or paused', () => {
        gs.gameActive = false;
        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);
        expect(gs.cameraX).toBe(0);

        gs.gameActive = true;
        gs.isPaused = true;
        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);
        expect(gs.cameraX).toBe(0);
    });

    it('should move player right when ArrowRight is pressed', () => {
        keys.current['ArrowRight'] = true;
        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);
        expect(gs.player.vel.x).toBeGreaterThan(0);
    });

    it('should handle jumping when on ground and Space is pressed', () => {
        gs.onGround = true;
        keys.current['Space'] = true;
        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);
        expect(gs.player.vel.y).toBeLessThan(0);
        expect(gs.onGround).toBe(false);
    });

    it('should trigger boss when player passes BOSS_TRIGGER_X', () => {
        gs.player.pos.x = BOSS_TRIGGER_X + 10;
        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);
        expect(gs.bossActive).toBe(true);
        expect(gs.entities.some(e => e.type === 'boss')).toBe(true);
    });

    it('should call onGameOver when HP reaches 0', () => {
        gs.hp = 0;
        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);
        expect(gs.gameActive).toBe(false);
        expect(onGameOver).toHaveBeenCalled();
    });

    it('should handle fall death', () => {
        gs.player.pos.y = 700;
        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);
        expect(actions.takeDamage).toHaveBeenCalledWith(1);
        expect(gs.player.pos.y).toBeLessThan(600);
    });

    it('should fire bullets when KeyS is pressed', () => {
        keys.current['KeyS'] = true;
        gs.lastShootTime = 0;
        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);
        expect(gs.bullets.length).toBe(1);
        expect(gs.lastShootTime).toBe(1000);
    });

    it('should handle hitting a question block', () => {
        const questionBlock = { type: 'block', blockType: 'question', pos: { x: 100, y: 50 }, width: 40, height: 40 } as any;
        gs.entities = [questionBlock];
        // Position player below it and moving up
        gs.player.pos = { x: 100, y: 90 };
        gs.player.vel = { x: 0, y: -10 };

        updateGame(gs, actions, keys, 1000, gameActiveRef, onVictory, onGameOver);

        // After collision, it should change blockType to brick
        expect(questionBlock.blockType).toBe('brick');
        // It might activate a powerup (random) or add score
        expect(actions.addScore).toHaveBeenCalledWith(100);
    });
});
