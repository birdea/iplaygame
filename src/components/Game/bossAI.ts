import type { Entity } from '../../types';
import { BOSS_SIZE, BOSS_TRIGGER_X } from '../../constants';

export interface BossTactics {
    lastAttackTime: number;
    state: 'idle' | 'punch' | 'fire';
    attackDuration: number;
    // Movement pattern
    moveDir: 1 | -1;          // current horizontal direction
    lastDirChangeTime: number; // when we last changed direction
    dirChangeCooldown: number; // ms until next direction change
    targetY: number;           // target Y for floating above tiles
}

export function createBossTactics(): BossTactics {
    return {
        lastAttackTime: 0,
        state: 'idle',
        attackDuration: 0,
        moveDir: -1,
        lastDirChangeTime: 0,
        dirChangeCooldown: 1500 + Math.random() * 1500,
        targetY: 0,
    };
}

export function createBossEntity(stage: number): Entity {
    // Boss spawns to the right of the trigger, floating above ground tiles (y=500)
    // Boss height = BOSS_SIZE, so to hover above ground: y = 500 - BOSS_SIZE - hover_gap
    const hoverGap = 20;
    const spawnY = 500 - BOSS_SIZE - hoverGap;
    return {
        id: 'boss',
        pos: { x: BOSS_TRIGGER_X + 600, y: spawnY },
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
 * Boss hovers just above the tile floor and moves left/right dynamically.
 */
export function updateBoss(
    boss: Entity,
    player: Entity,
    tactics: BossTactics,
    time: number,
    stage: number,
    gameActive: { current: boolean },
    cameraX: number,
    spawnBullet: (bullet: Entity) => void,
): void {
    // --- Hover above tiles ---
    // Ground tiles are at y=500, boss should hover just above them
    const GROUND_Y = 500;
    const HOVER_GAP = 20; // pixels above ground
    const targetY = GROUND_Y - boss.height - HOVER_GAP;

    // Smooth vertical approach (spring-like)
    const dy = targetY - boss.pos.y;
    boss.vel.y += dy * 0.05;
    boss.vel.y *= 0.85; // damping
    boss.pos.y += boss.vel.y;

    // Clamp so boss never goes underground
    if (boss.pos.y > targetY) {
        boss.pos.y = targetY;
        boss.vel.y = 0;
    }

    // --- Horizontal movement: varied left/right patterns ---
    const now = time;

    // Change direction on cooldown or when hitting arena boundaries
    // Boss should not enter left 25% of the screen (1000px * 0.25 = 250px)
    const arenaLeft = cameraX + 250;
    const arenaRight = cameraX + 950 - boss.width;

    if (
        now - tactics.lastDirChangeTime > tactics.dirChangeCooldown ||
        boss.pos.x <= arenaLeft ||
        boss.pos.x >= arenaRight
    ) {
        // Decide next move pattern
        const pattern = Math.random();
        if (pattern < 0.35) {
            // Chase player
            tactics.moveDir = player.pos.x < boss.pos.x ? -1 : 1;
            tactics.dirChangeCooldown = 800 + Math.random() * 800;
        } else if (pattern < 0.65) {
            // Retreat away from player
            tactics.moveDir = player.pos.x < boss.pos.x ? 1 : -1;
            tactics.dirChangeCooldown = 600 + Math.random() * 600;
        } else {
            // Random direction
            tactics.moveDir = Math.random() < 0.5 ? -1 : 1;
            tactics.dirChangeCooldown = 1000 + Math.random() * 2000;
        }
        tactics.lastDirChangeTime = now;
    }

    // Speed scales with stage and distance to player
    const baseSpeed = 2 + stage * 0.5;
    const dist = Math.abs(boss.pos.x - player.pos.x);
    const speedMult = dist > 400 ? 1.5 : dist < 150 ? 0.5 : 1.0;
    boss.vel.x = tactics.moveDir * baseSpeed * speedMult;
    boss.pos.x += boss.vel.x;

    // Clamp to arena
    boss.pos.x = Math.max(arenaLeft, Math.min(arenaRight, boss.pos.x));

    // --- Fire attack on cooldown ---
    const cooldown = 3500 / stage;
    if (time - tactics.lastAttackTime > cooldown) {
        tactics.state = 'fire';
        tactics.lastAttackTime = time;
        tactics.attackDuration = 1000;

        // Difficulty scales with stage: 
        // Stage 1: 1-3 bullets
        // Each stage increases max count by 1.5x up to 10
        const maxBullets = Math.min(10, Math.floor(3 * Math.pow(1.5, stage - 1)));
        const bulletCount = Math.floor(Math.random() * maxBullets) + 1;
        for (let i = 0; i < bulletCount; i++) {
            setTimeout(() => {
                if (!gameActive.current) return;
                // Spread index around 0 for fan pattern
                const spreadIdx = i - (bulletCount / 2);
                spawnBullet({
                    id: `boss-fire-${Date.now()}-${i}`,
                    pos: { x: boss.pos.x, y: boss.pos.y + boss.height * 0.4 + spreadIdx * 10 },
                    // Shoot in a wider fan pattern (various angles)
                    vel: {
                        x: -7 - Math.random() * 3,
                        y: spreadIdx * 2.5 + (Math.random() - 0.5) * 4
                    },
                    width: 30,
                    height: 30,
                    type: 'boss-bullet',
                });
            }, i * 150);
        }
    }

    // Attack duration countdown
    if (tactics.attackDuration > 0) {
        tactics.attackDuration -= 16;
        if (tactics.attackDuration <= 0) tactics.state = 'idle';
    }
}
