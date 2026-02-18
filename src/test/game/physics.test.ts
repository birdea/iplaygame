import { describe, it, expect, beforeEach } from 'vitest';
import { aabbOverlap, applyVerticalPhysics, applyHorizontalPhysics } from '../../components/game/physics';
import type { Entity, Block } from '../../components/core/types';
import { GRAVITY } from '../../components/core/constants';

describe('physics.ts', () => {
    describe('aabbOverlap', () => {
        it('should return true when entities overlap', () => {
            const a = { pos: { x: 0, y: 0 }, width: 10, height: 10 } as Entity;
            const b = { pos: { x: 5, y: 5 }, width: 10, height: 10 } as Entity;
            expect(aabbOverlap(a, b)).toBe(true);
        });

        it('should return false when entities do not overlap', () => {
            const a = { pos: { x: 0, y: 0 }, width: 10, height: 10 } as Entity;
            const b = { pos: { x: 11, y: 11 }, width: 10, height: 10 } as Entity;
            expect(aabbOverlap(a, b)).toBe(false);
        });

        it('should return false when entities are exactly adjacent', () => {
            const a = { pos: { x: 0, y: 0 }, width: 10, height: 10 } as Entity;
            const b = { pos: { x: 10, y: 0 }, width: 10, height: 10 } as Entity;
            expect(aabbOverlap(a, b)).toBe(false);
        });
    });

    describe('applyVerticalPhysics', () => {
        let player: Entity;

        beforeEach(() => {
            player = {
                pos: { x: 100, y: 100 },
                vel: { x: 0, y: 0 },
                width: 50,
                height: 50,
                type: 'player'
            } as Entity;
        });

        it('should apply gravity to player velocity', () => {
            applyVerticalPhysics(player, []);
            expect(player.vel.y).toBe(GRAVITY);
        });

        it('should update player position based on velocity', () => {
            player.vel.y = 10;
            applyVerticalPhysics(player, []);
            expect(player.pos.y).toBe(110 + GRAVITY);
        });

        it('should detect landing on a ground block', () => {
            const ground = {
                pos: { x: 100, y: 150 },
                width: 50,
                height: 50,
                type: 'block',
                blockType: 'ground'
            } as Block;

            player.vel.y = 5;
            const result = applyVerticalPhysics(player, [ground]);

            expect(result.onGround).toBe(true);
            expect(player.pos.y).toBe(ground.pos.y - player.height);
            expect(player.vel.y).toBe(0);
        });

        it('should detect hitting a question block from below', () => {
            const question = {
                pos: { x: 100, y: 50 },
                width: 50,
                height: 50,
                type: 'block',
                blockType: 'question'
            } as Block;

            player.pos.y = 100;
            player.vel.y = -10;
            const result = applyVerticalPhysics(player, [question]);

            expect(result.hitQuestion).toBe(question);
            expect(player.pos.y).toBe(question.pos.y + question.height);
            expect(player.vel.y).toBe(0);
        });
    });

    describe('applyHorizontalPhysics', () => {
        let player: Entity;

        beforeEach(() => {
            player = {
                pos: { x: 100, y: 100 },
                vel: { x: 0, y: 0 },
                width: 50,
                height: 50,
                type: 'player'
            } as Entity;
        });

        it('should move player horizontally', () => {
            player.vel.x = 5;
            applyHorizontalPhysics(player, []);
            expect(player.pos.x).toBe(105);
        });

        it('should stop player at a block from the left', () => {
            const block = {
                pos: { x: 150, y: 100 },
                width: 50,
                height: 50,
                type: 'block'
            } as Entity;

            player.vel.x = 10;
            applyHorizontalPhysics(player, [block]);

            expect(player.pos.x).toBe(block.pos.x - player.width);
        });

        it('should stop player at a block from the right', () => {
            const block = {
                pos: { x: 50, y: 100 },
                width: 50,
                height: 50,
                type: 'block'
            } as Entity;

            player.vel.x = -10;
            applyHorizontalPhysics(player, [block]);

            expect(player.pos.x).toBe(block.pos.x + block.width);
        });
    });
});
