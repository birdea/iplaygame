import type { Entity } from '../../types';
import { BULLET_SPEED } from '../../constants';
import { aabbOverlap } from './physics';

/** Create a player bullet */
export function createBullet(player: Entity, isBigBullet: boolean): Entity {
    return {
        id: `bullet-${Date.now()}-${Math.random()}`,
        pos: { x: player.pos.x + player.width, y: player.pos.y + 20 },
        vel: { x: BULLET_SPEED * (isBigBullet ? 1.2 : 1), y: 0 },
        width: isBigBullet ? 30 : 12,
        height: isBigBullet ? 30 : 12,
        type: 'bullet',
        damage: isBigBullet ? 2 : 1,
    };
}

/** Move all monsters and check monster-player collisions */
export function updateMonsters(
    entities: Entity[],
    player: Entity,
    takeDamage: (amount: number) => boolean,
    addScore: (amount: number) => void,
): Entity[] {
    const toRemove = new Set<string>();

    for (const e of entities) {
        if (e.type !== 'monster') continue;
        e.pos.x += e.vel.x;

        if (!aabbOverlap(player, e)) continue;

        // Stomp from above
        if (player.vel.y > 0 && player.pos.y + player.height - player.vel.y <= e.pos.y + 10) {
            toRemove.add(e.id);
            player.vel.y = -10;
            addScore(200);
        } else {
            if (takeDamage(1)) player.pos.x -= 100;
        }
    }

    if (toRemove.size === 0) return entities;
    return entities.filter(e => !toRemove.has(e.id));
}

export interface BulletCollisionResult {
    entities: Entity[];
    bullets: Entity[];
    bossDefeated: boolean;
    scoreGained: number;
}

/** Process all bullet movements and collisions */
export function updateBullets(
    bulletList: Entity[],
    entityList: Entity[],
    player: Entity,
    takeDamage: (amount: number) => boolean,
    cameraX: number,
): BulletCollisionResult {
    const bulletsToRemove = new Set<string>();
    const entitiesToRemove = new Set<string>();
    let bossDefeated = false;
    let scoreGained = 0;

    for (const b of bulletList) {
        b.pos.x += b.vel.x;
        b.pos.y += b.vel.y;

        if (b.type === 'bullet') {
            // Check boss hit
            const boss = entityList.find(ent => ent.type === 'boss');
            if (boss && aabbOverlap(b, boss)) {
                boss.hp = (boss.hp || 0) - (b.damage || 1);
                bulletsToRemove.add(b.id);
                if (boss.hp! <= 0) {
                    entitiesToRemove.add(boss.id);
                    scoreGained += 5000;
                    bossDefeated = true;
                }
            }

            // Check monster hit
            for (const ent of entityList) {
                if (ent.type !== 'monster') continue;
                if (aabbOverlap(b, ent)) {
                    entitiesToRemove.add(ent.id);
                    bulletsToRemove.add(b.id);
                    scoreGained += 200;
                }
            }
        } else if (b.type === 'boss-bullet') {
            if (aabbOverlap(b, player)) {
                if (takeDamage(1)) {
                    bulletsToRemove.add(b.id);
                    player.pos.x -= 50;
                }
            }
        }
    }

    // Filter out destroyed entities and bullets, plus off-screen bullets
    const entities = entitiesToRemove.size > 0
        ? entityList.filter(e => !entitiesToRemove.has(e.id))
        : entityList;

    const bullets = bulletList
        .filter(b => !bulletsToRemove.has(b.id))
        .filter(b => b.pos.x > cameraX - 100 && b.pos.x < cameraX + 1200);

    return { entities, bullets, bossDefeated, scoreGained };
}
