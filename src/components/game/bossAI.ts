import type { Entity, Bullet } from '../core/types';
import { GRAVITY, BULLET_SPEED } from '../core/constants';
import { createBullet } from './entityManager';

export interface BossTactics {
    state: 'idle' | 'fire' | 'angry';
    lastAttackTime: number;
    attackDuration: number;
}

export const createBossTactics = (): BossTactics => ({
    state: 'idle',
    lastAttackTime: 0,
    attackDuration: 0
});

export const createBossEntity = (stage: number): Entity => ({
    id: `boss-${Date.now()}`,
    type: 'boss',
    pos: { x: 2600, y: 100 },
    vel: { x: 0, y: 0 },
    width: 120,
    height: 120,
    hp: 100 + (stage - 1) * 50
} as Entity);

export function updateBoss(
    boss: Entity,
    player: Entity,
    tactics: BossTactics,
    time: number,
    stage: number,
    gameActiveRef: { current: boolean },
    spawnBullet: (b: Bullet) => void
) {
    // Gravity for boss
    boss.vel.y += GRAVITY * 0.4;
    boss.pos.y += boss.vel.y;

    if (boss.pos.y > 600 - 120 - 40) {
        boss.pos.y = 600 - 120 - 40;
        boss.vel.y = 0;
    }

    // Horizontal movement - chase player
    const dist = player.pos.x - boss.pos.x;
    const chaseSpeed = stage === 1 ? 2 : 3.5;
    if (Math.abs(dist) > 100) {
        boss.pos.x += dist > 0 ? chaseSpeed : -chaseSpeed;
    }

    // Attacks
    const attackCooldown = 4000 - (stage * 500);
    if (time - tactics.lastAttackTime > attackCooldown && tactics.state === 'idle') {
        tactics.state = 'fire';
        tactics.lastAttackTime = time;
        tactics.attackDuration = 90; // approx 1.5s at 60fps

        // Fire barrage
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (!gameActiveRef.current) return;
                const b = createBullet(boss, true) as Bullet;
                b.isEnemy = true;
                b.vel.x = -BULLET_SPEED * 0.6;
                b.vel.y = (i - 1) * 2;
                spawnBullet(b);
            }, i * 300);
        }
    }

    if (tactics.attackDuration > 0) {
        tactics.attackDuration--;
        if (tactics.attackDuration <= 0) tactics.state = 'idle';
    }
}
