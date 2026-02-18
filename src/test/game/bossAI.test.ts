import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBossTactics, createBossEntity, updateBoss } from '../../components/game/bossAI';
import type { Entity } from '../../components/core/types';
import { GRAVITY } from '../../components/core/constants';

describe('bossAI.ts', () => {
    describe('createBossTactics', () => {
        it('should create initial tactics state', () => {
            const tactics = createBossTactics();
            expect(tactics.state).toBe('idle');
            expect(tactics.lastAttackTime).toBe(0);
        });
    });

    describe('createBossEntity', () => {
        it('should create boss with HP based on stage', () => {
            const boss = createBossEntity(2);
            expect(boss.hp).toBe(100);
            expect(boss.type).toBe('boss');
        });
    });

    describe('updateBoss', () => {
        let boss: Entity;
        let player: Entity;
        let tactics: any;
        let spawnBullet: any;
        let gameActive: { current: boolean };

        beforeEach(() => {
            boss = { pos: { x: 500, y: 100 }, vel: { x: 0, y: 0 }, width: 100, height: 100, type: 'boss' } as Entity;
            player = { pos: { x: 100, y: 300 }, width: 50, height: 50 } as Entity;
            tactics = createBossTactics();
            spawnBullet = vi.fn();
            gameActive = { current: true };
            vi.useFakeTimers();
        });

        it('should apply gravity and fall to ground', () => {
            updateBoss(boss, player, tactics, 1000, 1, gameActive, spawnBullet);
            expect(boss.vel.y).toBe(GRAVITY * 0.4);
            expect(boss.pos.y).toBe(100 + boss.vel.y);
        });

        it('should chase player horizontally', () => {
            // Boss at 500, player at 100. Dist = 400.
            updateBoss(boss, player, tactics, 1000, 1, gameActive, spawnBullet);
            expect(boss.pos.x).toBe(498); // Moves left
        });

        it('should trigger fire attack on cooldown', () => {
            const cooldown = 3500;
            updateBoss(boss, player, tactics, cooldown + 1, 1, gameActive, spawnBullet);

            expect(tactics.state).toBe('fire');
            expect(tactics.lastAttackTime).toBe(cooldown + 1);

            // Fast-forward for bullets
            vi.advanceTimersByTime(1000);
            expect(spawnBullet).toHaveBeenCalledTimes(3);
        });

        it('should return to idle after attack duration', () => {
            tactics.state = 'fire';
            tactics.attackDuration = 16;
            updateBoss(boss, player, tactics, 1000, 1, gameActive, spawnBullet);
            expect(tactics.state).toBe('idle');
            expect(tactics.attackDuration).toBe(0);
        });
    });
});
