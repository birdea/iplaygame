import { describe, it, expect, vi } from 'vitest';
import { createInitialGameState, createGameActions } from '../../components/game/gameState';

describe('gameState.ts', () => {
    it('should create initial game state', () => {
        const gs = createInitialGameState(2);
        expect(gs.stage).toBe(2);
        expect(gs.hp).toBe(3);
        expect(gs.score).toBe(0);
        expect(gs.gameActive).toBe(true);
        expect(gs.entities.length).toBe(0);
    });

    describe('GameActions', () => {
        it('should handle takeDamage correctly', () => {
            const gs = createInitialGameState(1);
            const syncFn = vi.fn();
            const actions = createGameActions(gs, syncFn);

            const damaged = actions.takeDamage(1);
            expect(damaged).toBe(true);
            expect(gs.hp).toBe(2);
            expect(syncFn).toHaveBeenCalled();
            expect(gs.invincibleUntil).toBeGreaterThan(0);

            // Second damage within invincibility period should return false
            const damagedAgain = actions.takeDamage(1);
            expect(damagedAgain).toBe(false);
            expect(gs.hp).toBe(2);
        });

        it('should handle addScore correctly', () => {
            const gs = createInitialGameState(1);
            const syncFn = vi.fn();
            const actions = createGameActions(gs, syncFn);

            actions.addScore(500);
            expect(gs.score).toBe(500);
            expect(syncFn).toHaveBeenCalled();
        });

        it('should handle activatePowerup correctly', () => {
            const gs = createInitialGameState(1);
            const syncFn = vi.fn();
            const actions = createGameActions(gs, syncFn);

            actions.activatePowerup('bigBullet', 10000);
            expect(gs.powerups.bigBullet).toBeGreaterThan(Date.now());
            expect(syncFn).toHaveBeenCalled();
        });

        it('should handle togglePaused correctly', () => {
            const gs = createInitialGameState(1);
            const syncFn = vi.fn();
            const actions = createGameActions(gs, syncFn);

            actions.togglePaused(); // toggle to true
            expect(gs.isPaused).toBe(true);
            expect(syncFn).toHaveBeenCalled();

            actions.togglePaused(false); // force to false
            expect(gs.isPaused).toBe(false);
        });
    });
});
