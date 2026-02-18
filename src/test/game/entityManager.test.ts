import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBullet, updateMonsters, updateBullets } from '../../components/game/entityManager';
import type { Entity } from '../../components/core/types';

describe('entityManager.ts', () => {
    describe('createBullet', () => {
        it('should create a normal bullet', () => {
            const player = { pos: { x: 100, y: 100 }, width: 50, height: 50 } as Entity;
            const bullet = createBullet(player, false);
            expect(bullet.type).toBe('bullet');
            expect(bullet.damage).toBe(1);
            expect(bullet.width).toBe(12);
        });

        it('should create a big bullet', () => {
            const player = { pos: { x: 100, y: 100 }, width: 50, height: 50 } as Entity;
            const bullet = createBullet(player, true);
            expect(bullet.damage).toBe(2);
            expect(bullet.width).toBe(30);
        });
    });

    describe('updateMonsters', () => {
        let player: Entity;
        let takeDamage: any;
        let addScore: any;

        beforeEach(() => {
            player = { pos: { x: 100, y: 100 }, vel: { x: 0, y: 0 }, width: 50, height: 50, type: 'player' } as Entity;
            takeDamage = vi.fn().mockReturnValue(true);
            addScore = vi.fn();
        });

        it('should move monsters based on their velocity', () => {
            const monster = { id: 'm1', pos: { x: 200, y: 100 }, vel: { x: -5, y: 0 }, width: 50, height: 50, type: 'monster' } as Entity;
            updateMonsters([monster], player, takeDamage, addScore);
            expect(monster.pos.x).toBe(195);
        });

        it('should remove monster when stomped from above', () => {
            const monster = { id: 'm1', pos: { x: 100, y: 150 }, vel: { x: 0, y: 0 }, width: 50, height: 50, type: 'monster' } as Entity;
            player.pos.y = 101; // Overlap: Bottom at 151 > Monster top at 150
            player.vel.y = 10; // Moving down

            const entities = updateMonsters([monster], player, takeDamage, addScore);
            expect(entities.length).toBe(0);
            expect(player.vel.y).toBe(-10); // Bounce
            expect(addScore).toHaveBeenCalledWith(200);
        });

        it('should damage player when colliding horizontally', () => {
            const monster = { id: 'm1', pos: { x: 120, y: 100 }, vel: { x: 0, y: 0 }, width: 50, height: 50, type: 'monster' } as Entity;
            player.pos.y = 100;
            player.vel.y = 0;

            updateMonsters([monster], player, takeDamage, addScore);
            expect(takeDamage).toHaveBeenCalledWith(1);
            expect(player.pos.x).toBe(0); // Pos X (100) - 100
        });
    });

    describe('updateBullets', () => {
        let player: Entity;
        let takeDamage: any;

        beforeEach(() => {
            player = { pos: { x: 100, y: 100 }, width: 50, height: 50, type: 'player' } as Entity;
            takeDamage = vi.fn().mockReturnValue(true);
        });

        it('should move bullets and remove off-screen ones', () => {
            const bullet = { id: 'b1', pos: { x: 1000, y: 100 }, vel: { x: 10, y: 0 }, width: 10, height: 10, type: 'bullet' } as Entity;
            const result = updateBullets([bullet], [], player, takeDamage, 0);
            expect(bullet.pos.x).toBe(1010);
            // Camera at 0, bullet at 1010, still within 0-1200 range
            expect(result.bullets.length).toBe(1);

            const bullet2 = { id: 'b2', pos: { x: 1200, y: 100 }, vel: { x: 10, y: 0 }, width: 10, height: 10, type: 'bullet' } as Entity;
            const result2 = updateBullets([bullet2], [], player, takeDamage, 0);
            expect(result2.bullets.length).toBe(0); // Gone
        });

        it('should damage boss when hit by player bullet', () => {
            const bullet = { id: 'b1', pos: { x: 200, y: 100 }, vel: { x: 10, y: 0 }, width: 10, height: 10, type: 'bullet', damage: 5 } as Entity;
            const boss = { id: 'boss', pos: { x: 200, y: 100 }, width: 100, height: 100, type: 'boss', hp: 10 } as Entity;

            const result = updateBullets([bullet], [boss], player, takeDamage, 0);
            expect(boss.hp).toBe(5);
            expect(result.bullets.length).toBe(0);
            expect(result.bossDefeated).toBe(false);
        });

        it('should defeat boss when HP reaches 0', () => {
            const bullet = { id: 'b1', pos: { x: 200, y: 100 }, vel: { x: 10, y: 0 }, width: 10, height: 10, type: 'bullet', damage: 10 } as Entity;
            const boss = { id: 'boss', pos: { x: 200, y: 100 }, width: 100, height: 100, type: 'boss', hp: 10 } as Entity;

            const result = updateBullets([bullet], [boss], player, takeDamage, 0);
            expect(result.bossDefeated).toBe(true);
            expect(result.entities.length).toBe(0);
            expect(result.scoreGained).toBe(5000);
        });
    });
});
