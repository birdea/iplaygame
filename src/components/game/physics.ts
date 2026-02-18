import type { Entity, Block } from '../core/types';
import { GRAVITY } from '../core/constants';

/** AABB overlap check between two entities */
export function aabbOverlap(a: Entity, b: Entity): boolean {
    return a.pos.x < b.pos.x + b.width &&
        a.pos.x + a.width > b.pos.x &&
        a.pos.y < b.pos.y + b.height &&
        a.pos.y + a.height > b.pos.y;
}

export function applyVerticalPhysics(p: Entity, entities: Entity[]): { onGround: boolean, hitQuestion: Block | null } {
    let onGround = false;
    let hitQuestion: Block | null = null;

    p.vel.y += GRAVITY;
    p.pos.y += p.vel.y;

    for (const e of entities) {
        if (e.type === 'block') {
            const b = e as Block;
            if (aabbOverlap(p, b)) {
                if (p.vel.y > 0) {
                    p.pos.y = b.pos.y - p.height;
                    p.vel.y = 0;
                    onGround = true;
                } else if (p.vel.y < 0) {
                    p.pos.y = b.pos.y + b.height;
                    p.vel.y = 0;
                    if (b.blockType === 'question') hitQuestion = b;
                }
            }
        }
    }
    return { onGround, hitQuestion };
}

export function applyHorizontalPhysics(p: Entity, entities: Entity[]): void {
    p.pos.x += p.vel.x;
    for (const e of entities) {
        if (e.type === 'block' && aabbOverlap(p, e)) {
            if (p.vel.x > 0) p.pos.x = e.pos.x - p.width;
            else if (p.vel.x < 0) p.pos.x = e.pos.x + e.width;
        }
    }
}
