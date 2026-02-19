import type { Entity, Block } from '../../types';
import { GRAVITY } from '../../constants';
import { GAME_STRATEGY } from './GameStrategy';

const { COLLISION } = GAME_STRATEGY;

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

        if (player.vel.y > 0 && player.pos.y + player.height - player.vel.y <= e.pos.y + COLLISION.LANDING_BUFFER) {
            // Landing on top: Check with a narrower footprint 
            // to allow falling into 1-unit gaps
            const footprintWidth = player.width * COLLISION.FOOTPRINT_RATIO;
            const footprintX = player.pos.x + (player.width - footprintWidth) / 2;
            const isActuallyOnBlock = footprintX < e.pos.x + e.width && footprintX + footprintWidth > e.pos.x;

            if (isActuallyOnBlock) {
                player.pos.y = e.pos.y - player.height;
                player.vel.y = 0;
                onGround = true;
                standingOnBlock = e as Block;
            }
        } else if (player.vel.y < 0 && player.pos.y - player.vel.y >= e.pos.y + e.height - COLLISION.HEAD_HIT_BUFFER) {
            // Hitting head on bottom (use full width)
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

        // Use a vertically narrower footprint for horizontal collisions
        // to prevent snapping back when standing on top or hitting corners.
        const vertInset = COLLISION.HORIZONTAL_INSET;
        const hasVerticalOverlap = (player.pos.y + vertInset < e.pos.y + e.height) &&
            (player.pos.y + player.height - vertInset > e.pos.y);
        const hasHorizontalOverlap = (player.pos.x < e.pos.x + e.width) &&
            (player.pos.x + player.width > e.pos.x);

        if (!hasVerticalOverlap || !hasHorizontalOverlap) continue;

        if (player.vel.x > 0) {
            player.pos.x = e.pos.x - player.width;
        } else if (player.vel.x < 0) {
            player.pos.x = e.pos.x + e.width;
        }
    }
}

