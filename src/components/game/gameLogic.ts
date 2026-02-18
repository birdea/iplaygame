import { MOVE_SPEED, JUMP_FORCE, BOSS_TRIGGER_X, AUTO_SCROLL_SPEED } from '../core/constants';
import { applyVerticalPhysics, applyHorizontalPhysics, aabbOverlap } from './physics';
import { createBossEntity, updateBoss } from './bossAI';
import { createBullet, updateMonsters, updateBullets } from './entityManager';
import type { GameLoopState, GameActions } from './gameState';
import type { Block } from '../core/types';
import confetti from 'canvas-confetti';

export function updateGame(
    gs: GameLoopState,
    actions: GameActions,
    keys: { current: { [key: string]: boolean } },
    time: number,
    gameActiveRef: { current: boolean },
    onVictory: () => void,
    onGameOver: () => void
): void {
    if (!gs.gameActive || gs.isPaused) return;

    // -- 1. LOGIC UPDATES --
    gs.cameraX += AUTO_SCROLL_SPEED;
    const speedMult = gs.powerups.fastRun > Date.now() ? 1.6 : 1;
    const p = gs.player;

    // Input handling
    p.vel.x = 0;
    if (keys.current['ArrowLeft'] || keys.current['KeyA']) p.vel.x = -MOVE_SPEED * speedMult;
    if (keys.current['ArrowRight'] || keys.current['KeyD']) p.vel.x = MOVE_SPEED * speedMult;

    if ((keys.current['ArrowUp'] || keys.current['KeyW'] || keys.current['Space']) && gs.onGround) {
        p.vel.y = JUMP_FORCE;
        gs.onGround = false;
    }

    // Shoot
    if (keys.current['KeyS'] && time - gs.lastShootTime > 300) {
        const isBig = gs.powerups.bigBullet > Date.now();
        gs.bullets.push(createBullet(p, isBig));
        gs.lastShootTime = time;
    }

    // Physics
    const vertResult = applyVerticalPhysics(p, gs.entities);
    gs.onGround = vertResult.onGround;

    if (vertResult.hitQuestion) {
        vertResult.hitQuestion.blockType = 'brick';
        const rand = Math.random();
        if (rand < 0.25) actions.activatePowerup('bigBullet', 30000);
        else if (rand < 0.5) actions.activatePowerup('fastRun', 30000);
        else if (rand < 0.75) actions.setHP(gs.hp + 1);
        actions.addScore(100);
    }

    applyHorizontalPhysics(p, gs.entities);

    // Fall Death
    if (p.pos.y > 600) {
        actions.takeDamage(1);
        const groundBlocks = gs.entities.filter(e => e.type === 'block' && (e as Block).blockType === 'ground');
        const nextSafe = groundBlocks.find(e => e.pos.x > gs.cameraX + 100) || groundBlocks[0];
        p.pos = nextSafe ? { x: nextSafe.pos.x, y: nextSafe.pos.y - 100 } : { x: gs.cameraX + 100, y: 300 };
        p.vel = { x: 0, y: 0 };
    }

    // Camera boundary
    if (p.pos.x < gs.cameraX) p.pos.x = gs.cameraX;

    // Boss trigger
    if (p.pos.x > BOSS_TRIGGER_X && !gs.bossActive) {
        gs.bossActive = true;
        gs.entities.push(createBossEntity(gs.stage));
    }

    // Monster logic
    gs.entities = updateMonsters(
        gs.entities, p, (amt) => actions.takeDamage(amt),
        (amt) => actions.addScore(amt),
    );

    // Boss AI
    const boss = gs.entities.find(e => e.type === 'boss');
    if (boss) {
        updateBoss(
            boss, p, gs.bossTactics, time, gs.stage, gameActiveRef,
            (bullet) => { gs.bullets.push(bullet); },
        );
        // Boss-player collision
        if (aabbOverlap(p, boss)) {
            if (actions.takeDamage(1)) p.pos.x -= 200;
        }
    }

    // Bullet collisions
    const bulletResult = updateBullets(gs.bullets, gs.entities, p, (amt) => actions.takeDamage(amt), gs.cameraX);
    gs.entities = bulletResult.entities;
    gs.bullets = bulletResult.bullets;

    if (bulletResult.bossDefeated) {
        actions.addScore(bulletResult.scoreGained);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        gs.gameActive = false;
        onVictory();
    } else if (bulletResult.scoreGained > 0) {
        actions.addScore(bulletResult.scoreGained);
    }

    gs.cameraX = Math.max(gs.cameraX, p.pos.x - 400);

    // Death check
    if (gs.hp <= 0) {
        gs.gameActive = false;
        onGameOver();
    }
}
