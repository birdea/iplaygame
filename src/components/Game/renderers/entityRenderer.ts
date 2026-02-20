import type { Entity, Monster, GroundItem, Effect } from '../../../types';
import { getStageLength } from '../../../constants';


/** Draw a monster with limbs, body, and face */
export function drawMonster(
    ctx: CanvasRenderingContext2D,
    e: Entity,
    m: Monster,
    time: number,
    faceImg: HTMLImageElement | null,
): void {
    ctx.save();
    ctx.translate(e.pos.x + e.width / 2, e.pos.y + e.height / 2);
    if (e.vel.x > 0) {
        ctx.scale(-1, 1);
    }
    ctx.translate(-e.width / 2, -e.height / 2);

    ctx.shadowColor = 'black';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const walkCycle = Math.sin(time / 150);
    const limbWidth = m.monsterType === 'skinny' ? 4 : (m.monsterType === 'fat' ? 12 : 6);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = limbWidth;
    ctx.lineCap = 'round';

    if (m.monsterType === 'fly') {
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.6;
        const wingOsc = Math.sin(time / 50) * 20;
        ctx.beginPath(); ctx.ellipse(-10, 20, 20, Math.max(0.1, 10 + wingOsc), Math.PI / 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.width + 10, 20, 20, Math.max(0.1, 10 + wingOsc), -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.beginPath(); ctx.moveTo(e.width * 0.3, e.height); ctx.lineTo(e.width * 0.3, e.height + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(e.width * 0.7, e.height); ctx.lineTo(e.width * 0.7, e.height + 10); ctx.stroke();
    } else {
        ctx.save(); ctx.translate(e.width * 0.3, e.height); ctx.rotate(walkCycle * 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(e.width * 0.7, e.height); ctx.rotate(-walkCycle * 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(0, e.height * 0.4); ctx.rotate(-walkCycle * 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, 10); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(e.width, e.height * 0.4); ctx.rotate(walkCycle * 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 10); ctx.stroke(); ctx.restore();
    }

    ctx.fillStyle = m.monsterType === 'skinny' ? '#FF5252' : (m.monsterType === 'fat' ? '#D32F2F' : '#7E57C2');
    ctx.fillRect(0, 0, e.width, e.height);

    const wobbleAngle = Math.sin(time / 400) * 0.18;
    if (faceImg) {
        ctx.save();
        ctx.translate(e.width / 2, e.height / 2);
        ctx.rotate(wobbleAngle);
        ctx.beginPath();
        ctx.arc(0, -e.height / 2 + e.height / 2, e.width / 2 - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(faceImg, -e.width / 2 + 2, -e.height / 2 + 2, e.width - 4, e.height - 4);
        ctx.restore();

        ctx.save();
        ctx.translate(e.width / 2, e.height / 2);
        ctx.rotate(wobbleAngle);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.width / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

/** Draw bullets (player and boss) */
export function drawBullets(ctx: CanvasRenderingContext2D, bulletList: Entity[]): void {
    for (const b of bulletList) {
        ctx.fillStyle = b.type === 'boss-bullet' ? '#FFD700' : 'white';
        ctx.beginPath();
        ctx.arc(b.pos.x + b.width / 2, b.pos.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
        ctx.fill();
        if (b.type === 'boss-bullet') {
            ctx.fillStyle = 'rgba(255, 69, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(b.pos.x + b.width + 5, b.pos.y + b.height / 2, b.width / 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/** Draw ground items that have popped out of question blocks */
export function drawGroundItems(ctx: CanvasRenderingContext2D, items: GroundItem[]): void {
    const now = Date.now();
    for (const item of items) {
        const age = now - item.spawnedAt;
        const nearExpiry = age > 7_000;
        if (nearExpiry && Math.floor(now / 150) % 2 === 0) continue;

        const { x, y } = item.pos;
        const { width, height } = item;
        ctx.save();
        ctx.translate(x, y);

        const color = item.powerup === 'bigBullet' ? '#FF6F00'
            : item.powerup === 'fastRun' ? '#00C853'
                : item.powerup === 'shield' ? '#2196F3'
                    : item.powerup === 'ammo' ? '#FFEB3B'
                        : '#E53935';
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = (item.powerup === 'ammo') ? '#333' : '#fff';
        ctx.font = `bold ${Math.round(height * 0.55)}px Courier`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = item.powerup === 'bigBullet' ? 'B'
            : item.powerup === 'fastRun' ? 'F'
                : item.powerup === 'shield' ? 'S'
                    : item.powerup === 'ammo' ? 'A'
                        : '♥';
        ctx.fillText(label, width / 2, height / 2 + 1);

        ctx.restore();
    }
}

/** Draw various special effects (explosions, etc) */
export function drawEffects(ctx: CanvasRenderingContext2D, effects: Effect[]): void {
    for (const eff of effects) {
        ctx.save();
        ctx.globalAlpha = eff.life;
        ctx.fillStyle = eff.color;
        ctx.beginPath();
        ctx.arc(eff.pos.x, eff.pos.y, eff.size * eff.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/** Minimap drawing helper */
export function drawMinimap(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    minimapWidth: number,
    minimapHeight: number,
    cameraX: number,
    player: Entity,
    boss: Entity | undefined,
    stage: number,
): void {
    ctx.save();
    ctx.translate(canvasWidth - minimapWidth - 20, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, minimapWidth, minimapHeight);
    ctx.clip();

    const stageLength = getStageLength(stage);
    const mScaleX = minimapWidth / stageLength;
    const mScaleY = minimapHeight / 600;
    ctx.scale(mScaleX, mScaleY);
    ctx.translate(-cameraX, 0);

    ctx.fillStyle = '#5D4037';
    ctx.fillRect(cameraX, 500, stageLength + 1000, 100);

    if (boss) {
        ctx.fillStyle = '#FF1744';
        ctx.fillRect(boss.pos.x, boss.pos.y, boss.width, boss.height);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(player.pos.x, player.pos.y, player.width, player.height);

    ctx.restore();
}
