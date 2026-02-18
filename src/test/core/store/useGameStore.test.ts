import { describe, it, expect } from 'vitest';
import { useGameStore } from '../../stor../../../components/core/store/useGameStore';

describe('useGameStore', () => {
    it('should initialize with default state', () => {
        const state = useGameStore.getState();
        expect(state.screen).toBe('menu');
        expect(state.hp).toBe(3);
        expect(state.stage).toBe(1);
    });

    it('should set screen', () => {
        useGameStore.getState().setScreen('game');
        expect(useGameStore.getState().screen).toBe('game');
    });

    it('should add faces', () => {
        useGameStore.getState().addFace('face1');
        expect(useGameStore.getState().faces).toContain('face1');

        // Test limit
        for (let i = 2; i <= 12; i++) {
            useGameStore.getState().addFace(`face${i}`);
        }
        expect(useGameStore.getState().faces.length).toBe(10);
        expect(useGameStore.getState().faces).not.toContain('face1');
    });

    it('should reset game', () => {
        useGameStore.getState().syncFromLoop({
            hp: 1,
            score: 1000,
            powerups: { bigBullet: 100, fastRun: 100 },
            isPaused: true,
            stage: 2,
        });
        useGameStore.getState().resetGame();
        const state = useGameStore.getState();
        expect(state.hp).toBe(3);
        expect(state.score).toBe(0);
        expect(state.stage).toBe(1);
    });

    it('should go to next stage', () => {
        useGameStore.getState().setScreen('menu'); // Ensure we starting from fresh enough state
        // Since store is global and doesn't reset automatically in tests unless we do it
        useGameStore.getState().syncFromLoop({ stage: 1, hp: 3, score: 0, powerups: { bigBullet: 0, fastRun: 0 }, isPaused: false });

        useGameStore.getState().nextStage();
        expect(useGameStore.getState().stage).toBe(2);
    });
});
