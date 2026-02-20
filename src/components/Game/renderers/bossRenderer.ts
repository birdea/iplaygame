import type { Entity } from '../../../types';
import { GAME_STRATEGY } from '../../../config/GameStrategy';

export function drawDragon(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    time: number, state: string,
    stage: number = 1,
    facingVal: number = -1,
): void {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(facingVal, 1);

    const scale = Math.min(width, height) / 300;
    ctx.scale(scale, scale);

    const bodyColor = state === 'punch' ? '#FF1744' : '#1A237E';
    const strokeColor = '#FFFFFF';
    ctx.lineWidth = 5;

    const { BOSS } = GAME_STRATEGY;
    // Draw Tail
    const tailX = -110;
    const tailY = 20;
    const tsCount = BOSS.LIMBS.TAIL_SEGMENT_COUNT;
    const tsLen = BOSS.LIMBS.TAIL_SEGMENT_LENGTH;

    ctx.save();
    ctx.translate(tailX, tailY);
    let ctxX = 0, ctxY = 0;
    const tailBaseAngle = Math.PI;
    let lastAngle = tailBaseAngle;
    for (let s = 0; s < tsCount; s++) {
        const phase = time / 800 + s * 0.4;
        const wave = Math.sin(phase) * 0.5;
        const angle = tailBaseAngle + wave;
        lastAngle = angle;
        ctx.save();
        ctx.translate(ctxX, ctxY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(tsLen, 0);
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 10 - s * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill(); ctx.stroke();
        ctx.restore();
        ctxX += Math.cos(angle) * tsLen;
        ctxY += Math.sin(angle) * tsLen;
    }
    // Tail Tip (Fan Shape, 50% larger)
    const tipScale = (stage > 1 ? (1 + (stage - 2) * 0.2) : 1) * 1.5;
    ctx.save();
    ctx.translate(ctxX, ctxY);
    ctx.rotate(lastAngle);
    ctx.scale(tipScale, tipScale);

    // Fan/Arc shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 25, -Math.PI / 4, Math.PI / 4);
    ctx.closePath();

    ctx.fillStyle = '#FF1744'; // Red!
    ctx.fill(); ctx.stroke();

    // Add some detail to the fan
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(25, -Math.PI / 8);
    ctx.moveTo(0, 0);
    ctx.lineTo(25, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(25, Math.PI / 8);
    ctx.stroke();

    ctx.restore();
    ctx.restore();

    const drawDiamond = (dx: number, dy: number, s: number, angle: number) => {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.6, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.6, 0);
        ctx.closePath();
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = strokeColor;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    };

    // Back diamond "spikes"
    for (let i = 0; i < 3; i++) {
        const offset = Math.sin(time / 200 + i) * 10;
        drawDiamond(-80 - i * 40, offset - 20, 30, Math.PI / 4);
        drawDiamond(-80 - i * 40, offset + 60, 30, -Math.PI / 4);
    }

    // Body
    ctx.beginPath();
    ctx.arc(-60, 20, 50, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = strokeColor;
    ctx.fill();
    ctx.stroke();

    // Head (Pac-man mouth)
    ctx.save();
    const mouthOpen = Math.abs(Math.sin(time / 300)) * 0.5 + 0.2;
    ctx.beginPath();
    ctx.arc(40, 0, 80, mouthOpen, Math.PI * 2 - mouthOpen);
    ctx.lineTo(40, 0);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = strokeColor;
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = (state === 'fire' || state === 'punch') ? 'yellow' : 'white';
    ctx.beginPath();
    ctx.ellipse(60, -30, 20, 10, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(70, -35, 5, 0, Math.PI * 2);
    ctx.fill();

    // Fire Breath
    if (state === 'fire') {
        ctx.save();
        ctx.translate(100, 0);
        ctx.fillStyle = '#FFEB3B';
        const breathLen = 120 * Math.pow(1.2, stage - 1);
        for (let i = 0; i < 8; i++) {
            const fx = Math.random() * breathLen;
            const fy = (Math.random() - 0.5) * 60;
            ctx.beginPath();
            ctx.arc(fx, fy, 15 + Math.random() * 15, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    ctx.restore();
    ctx.restore();
}

/** Draw the boss HP bar */
export function drawBossHPBar(ctx: CanvasRenderingContext2D, boss: Entity): void {
    const barWidth = boss.width;
    const barHeight = 15;
    const bx = boss.pos.x;
    const by = boss.pos.y - 40;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, barWidth, barHeight);

    const hpRatio = Math.max(0, boss.hp! / (boss.maxHP || 100));
    const hpWidth = hpRatio * barWidth;

    ctx.fillStyle = hpRatio > 0.6 ? '#4CAF50' : hpRatio > 0.3 ? '#FFA726' : '#EF5350';
    ctx.fillRect(bx, by, hpWidth, barHeight);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(boss.hp!)} / ${boss.maxHP}`, bx + barWidth / 2, by + barHeight / 2 + 1);

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
}
