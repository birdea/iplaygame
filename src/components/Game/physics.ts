import type { Entity, Block } from '../../types';
import { GRAVITY } from '../../constants';

/** AABB overlap check between two entities */
export function aabbOverlap(a: Entity, b: Entity): boolean {
    return (
        a.pos.x < b.pos.x + b.width &&
        a.pos.x + a.width > b.pos.x &&
        a.pos.y < b.pos.y + b.height &&
        a.pos.y + a.height > b.pos.y
    );
}

export interface VerticalCollisionResult {
    onGround: boolean;
    hitQuestion: Block | null;
}

/**
 * Apply gravity and resolve vertical collisions between player and blocks.
 * Mutates player pos/vel in place. Returns collision info.
 */
export function applyVerticalPhysics(
    player: Entity,
    blocks: Entity[],
): VerticalCollisionResult {
    player.vel.y += GRAVITY;
    player.pos.y += player.vel.y;

    let onGround = false;
    let hitQuestion: Block | null = null;

    for (const e of blocks) {
        if (e.type !== 'block') continue;
        if (!aabbOverlap(player, e)) continue;

        if (player.vel.y > 0 && player.pos.y + player.height - player.vel.y <= e.pos.y + 10) {
            // Landing on top
            player.pos.y = e.pos.y - player.height;
            player.vel.y = 0;
            onGround = true;
        } else if (player.vel.y < 0 && player.pos.y - player.vel.y >= e.pos.y + e.height - 10) {
            // Hitting head on bottom
            player.pos.y = e.pos.y + e.height;
            player.vel.y = 0;
            if ((e as Block).blockType === 'question') {
                hitQuestion = e as Block;
            }
        }
    }

    return { onGround, hitQuestion };
}

/**
 * Apply horizontal movement and resolve horizontal collisions with blocks.
 * Mutates player pos in place.
 */
export function applyHorizontalPhysics(player: Entity, blocks: Entity[]): void {
    player.pos.x += player.vel.x;

    for (const e of blocks) {
        if (e.type !== 'block') continue;
        if (!aabbOverlap(player, e)) continue;

        if (player.vel.x > 0) {
            player.pos.x = e.pos.x - player.width;
        } else if (player.vel.x < 0) {
            player.pos.x = e.pos.x + e.width;
        }
    }
}
