import type { Entity } from '../../types';
import { GRAVITY, BOSS_SIZE, BOSS_TRIGGER_X } from '../../constants';

export interface BossTactics {
    lastAttackTime: number;
    state: 'idle' | 'punch' | 'fire';
    attackDuration: number;
}

export function createBossTactics(): BossTactics {
    return { lastAttackTime: 0, state: 'idle', attackDuration: 0 };
}

export function createBossEntity(stage: number): Entity {
    return {
        id: 'boss',
        pos: { x: BOSS_TRIGGER_X + 600, y: 100 },
        vel: { x: -2, y: 0 },
        width: BOSS_SIZE,
        height: BOSS_SIZE,
        type: 'boss',
        hp: 50 * stage,
        maxHP: 50 * stage,
    };
}

/**
 * Update boss physics, AI behavior, and attack patterns.
 * Mutates boss entity and tactics in place.
 * Fires bullets asynchronously via the provided `spawnBullet` callback (called from setTimeout).
 */
export function updateBoss(
    boss: Entity,
    player: Entity,
    tactics: BossTactics,
    time: number,
    stage: number,
    gameActive: { current: boolean },
    spawnBullet: (bullet: Entity) => void,
): void {
    // Gravity (reduced for boss)
    boss.vel.y += GRAVITY * 0.4;
    boss.pos.y += boss.vel.y;

    // Ground collision & random jumps
    if (boss.pos.y + boss.height > 500) {
        boss.pos.y = 500 - boss.height;
        boss.vel.y = 0;
        if (Math.random() < 0.02) boss.vel.y = -12;
    }

    // Chase player horizontally
    const dist = boss.pos.x - player.pos.x;
    if (dist > 300) boss.pos.x -= 2;
    else if (dist < 100) boss.pos.x += 2;

    // Fire attack on cooldown
    const cooldown = 3500 / stage;
    if (time - tactics.lastAttackTime > cooldown) {
        tactics.state = 'fire';
        tactics.lastAttackTime = time;
        tactics.attackDuration = 1000;

        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (!gameActive.current) return;
                spawnBullet({
                    id: `boss-fire-${Date.now()}-${i}`,
                    pos: { x: boss.pos.x, y: boss.pos.y + boss.height * 0.4 + i * 20 },
                    vel: { x: -6 - Math.random() * 2, y: (Math.random() - 0.5) * 2 },
                    width: 30,
                    height: 30,
                    type: 'boss-bullet',
                });
            }, i * 300);
        }
    }

    // Attack duration countdown
    if (tactics.attackDuration > 0) {
        tactics.attackDuration -= 16;
        if (tactics.attackDuration <= 0) tactics.state = 'idle';
    }
}
