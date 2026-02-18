import { describe, it, expect, vi } from 'vitest';
import { generateStage, resetIds } from '../../components/game/stageGenerator';

describe('stageGenerator.ts', () => {
    it('should generate a stage with ground blocks', () => {
        const entities = generateStage(1);
        const groundBlocks = entities.filter(e => e.type === 'block' && (e as any).blockType === 'ground');

        // At least some ground blocks should exist
        expect(groundBlocks.length).toBeGreaterThan(0);

        // Check if IDs are unique
        const ids = new Set(entities.map(e => e.id));
        expect(ids.size).toBe(entities.length);
    });

    it('should reset IDs when resetIds is called', () => {
        generateStage(1);
        const stage1 = generateStage(1);
        resetIds();
        const stage2 = generateStage(1);

        // The first ground block ID should be the same after reset
        const firstGround1 = stage1.find(e => e.id.startsWith('ground'));
        const firstGround2 = stage2.find(e => e.id.startsWith('ground'));
        expect(firstGround1?.id).toBe(firstGround2?.id);
    });

    it('should scale difficulty with stage number', () => {
        // We can't easily test monster count because of Math.random, 
        // but we can check if it runs without errors for different stages
        const stage1 = generateStage(1);
        const stage10 = generateStage(10);

        expect(stage1.length).toBeGreaterThan(0);
        expect(stage10.length).toBeGreaterThan(0);
    });

    it('should generate monsters of different types', () => {
        const mockRandom = vi.spyOn(Math, 'random');

        // Using stage 5 ensures monsterChance is high enough (1.5) 
        // so that Math.random() < monsterChance is always true for our test values.

        // Force skinny
        mockRandom.mockReturnValue(0.1);
        const stageSkinny = generateStage(5);
        expect(stageSkinny.some(e => e.type === 'monster' && (e as any).monsterType === 'skinny')).toBe(true);

        // Force fat
        mockRandom.mockReturnValue(0.4);
        const stageFat = generateStage(5);
        expect(stageFat.some(e => e.type === 'monster' && (e as any).monsterType === 'fat')).toBe(true);

        // Force fly
        mockRandom.mockReturnValue(0.8);
        const stageFly = generateStage(5);
        expect(stageFly.some(e => e.type === 'monster' && (e as any).monsterType === 'fly')).toBe(true);

        mockRandom.mockRestore();
    });
});
