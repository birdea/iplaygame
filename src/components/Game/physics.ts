import type { Entity, Block } from '../../types';
import { GRAVITY } from '../../constants';

/** AABB overlap check between two entities with optional scaling ratio */
export function aabbOverlap(a: Entity, b: Entity, ratio: number = 1.0): boolean {
    if (ratio === 1.0) {
        return (
            a.pos.x < b.pos.x + b.width &&
            a.pos.x + a.width > b.pos.x &&
            a.pos.y < b.pos.y + b.height &&
            a.pos.y + a.height > b.pos.y
        );
    }

    const wa = a.width * ratio;
    const ha = a.height * ratio;
    const xa = a.pos.x + (a.width - wa) / 2;
    const ya = a.pos.y + (a.height - ha) / 2;

    const wb = b.width * ratio;
    const hb = b.height * ratio;
    const xb = b.pos.x + (b.width - wb) / 2;
    const yb = b.pos.y + (b.height - hb) / 2;

    return (
        xa < xb + wb &&
        xa + wa > xb &&
        ya < yb + hb &&
        ya + ha > yb
    );
}

export interface VerticalCollisionResult {
    onGround: boolean;
    hitQuestion: Block | null;
    /** The block the player is currently standing on (null if airborne) */
    standingOnBlock: Block | null;
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
    let standingOnBlock: Block | null = null;

    for (const e of blocks) {
        if (e.type !== 'block') continue;
        if (!aabbOverlap(player, e)) continue;

        if (player.vel.y > 0 && player.pos.y + player.height - player.vel.y <= e.pos.y + 10) {
            // Landing on top
            player.pos.y = e.pos.y - player.height;
            player.vel.y = 0;
            onGround = true;
            standingOnBlock = e as Block;
        } else if (player.vel.y < 0 && player.pos.y - player.vel.y >= e.pos.y + e.height - 10) {
            // Hitting head on bottom
            player.pos.y = e.pos.y + e.height;
            player.vel.y = 0;
            if ((e as Block).blockType === 'question') {
                hitQuestion = e as Block;
            }
        }
    }

    return { onGround, hitQuestion, standingOnBlock };
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
