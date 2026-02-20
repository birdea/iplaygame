import { COLORS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../constants';
import { GAME_STRATEGY } from '../../../config/GameStrategy';

/** Draw parallax sky, clouds, and hills */
export function drawBackground(ctx: CanvasRenderingContext2D, cameraX: number, time: number): void {
    const width = CANVAS_WIDTH;

    // Sky
    ctx.fillStyle = COLORS.SKY;
    ctx.fillRect(0, 0, width, CANVAS_HEIGHT);

    // Clouds (Far Parallax - 10% speed)
    const cloudX = -(cameraX * 0.1) % 400;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = -1; i < 4; i++) {
        const cx = cloudX + i * 400 + 50;
        const cy = 100 + Math.sin(time / 2000 + i) * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.arc(cx + 40, cy, 40, 0, Math.PI * 2);
        ctx.arc(cx + 80, cy, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    // Hills (Near Parallax - 30% speed)
    const hillX = -(cameraX * 0.3) % 800;
    ctx.fillStyle = '#228B22';
    ctx.strokeStyle = '#004d00';
    ctx.lineWidth = 4;
    for (let i = -1; i < 3; i++) {
        const hx = hillX + i * 800;
        ctx.beginPath();
        ctx.moveTo(hx, GAME_STRATEGY.PHYSICS.GROUND_Y);
        ctx.quadraticCurveTo(hx + 200, 200, hx + 400, GAME_STRATEGY.PHYSICS.GROUND_Y);
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = '#32CD32';
        const hx2 = hillX + i * 800 + 400;
        ctx.beginPath();
        ctx.moveTo(hx2, GAME_STRATEGY.PHYSICS.GROUND_Y);
        ctx.quadraticCurveTo(hx2 + 150, 300, hx2 + 300, GAME_STRATEGY.PHYSICS.GROUND_Y);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

/** Draw an SMB3-style block (ground, brick, or question) */
export function drawBlock(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    type: 'ground' | 'brick' | 'question',
    isCrumbling = false,
    hitCount = 0,
): void {
    ctx.save();

    // Crumble shake: jitter position slightly
    const shakeX = isCrumbling ? (Math.random() - 0.5) * 4 : 0;
    const shakeY = isCrumbling ? (Math.random() - 0.5) * 4 : 0;
    ctx.translate(x + shakeX, y + shakeY);

    if (type === 'ground') {
        ctx.fillStyle = COLORS.GROUND;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#3E2723';
        const dotSize = 4;
        ctx.fillRect(8, 8, dotSize, dotSize);
        ctx.fillRect(w - 12, 8, dotSize, dotSize);
        ctx.fillRect(8, h - 12, dotSize, dotSize);
        ctx.fillRect(w - 12, h - 12, dotSize, dotSize);
    } else if (type === 'brick') {
        ctx.fillStyle = COLORS.BRICK;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        ctx.beginPath();
        ctx.moveTo(1, h / 2); ctx.lineTo(w - 1, h / 2);
        ctx.moveTo(w / 2, 1); ctx.lineTo(w / 2, h / 2);
        ctx.moveTo(w / 4, h / 2); ctx.lineTo(w / 4, h - 1);
        ctx.moveTo(3 * w / 4, h / 2); ctx.lineTo(3 * w / 4, h - 1);
        ctx.stroke();
    } else if (type === 'question') {
        ctx.fillStyle = COLORS.QUESTION;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 36px Courier';
        ctx.textAlign = 'center';
        ctx.fillText('?', w / 2, h / 2 + 12);
        ctx.fillRect(4, 4, 3, 3); ctx.fillRect(w - 7, 4, 3, 3);
        ctx.fillRect(4, h - 7, 3, 3); ctx.fillRect(w - 7, h - 7, 3, 3);
    }

    // Crumble warning overlay: red flash at ~8Hz
    if (isCrumbling && Math.floor(Date.now() / 60) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 50, 0, 0.45)';
        ctx.fillRect(0, 0, w, h);
    }

    // Progressive damage cracks
    if (hitCount > 0 && type !== 'ground') {
        const maxHits = GAME_STRATEGY.STAGE.PLATFORMS.BLOCK_MAX_HITS || 4;
        const intensity = hitCount / maxHits;

        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1 + intensity * 2;
        ctx.beginPath();

        if (hitCount >= 1) {
            ctx.moveTo(w * 0.2, 0); ctx.lineTo(w * 0.5, h * 0.4); ctx.lineTo(w * 0.3, h);
        }
        if (hitCount >= 2) {
            ctx.moveTo(w * 0.8, 0); ctx.lineTo(w * 0.6, h * 0.5); ctx.lineTo(w * 0.7, h);
        }
        if (hitCount >= 3) {
            ctx.moveTo(0, h * 0.3); ctx.lineTo(w, h * 0.7);
        }
        if (hitCount >= 4) {
            ctx.moveTo(0, h * 0.8); ctx.lineTo(w * 0.4, h * 0.5); ctx.lineTo(w, h * 0.2);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, 0, w, h);
        }
        ctx.stroke();
    }

    ctx.restore();
}

/** Draw red outer glow when damaged */
export function drawDamageVignette(ctx: CanvasRenderingContext2D, lastDamageTime: number, now: number): void {
    const elapsed = now - lastDamageTime;
    if (elapsed > 1000) return;

    const alpha = Math.max(0, 0.4 * (1 - elapsed / 1000));
    const gradient = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.3,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.6
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
}

/** Draw large flashing boss warning message */
export function drawBossWarning(ctx: CanvasRenderingContext2D, now: number): void {
    const isVisible = Math.floor(now / 200) % 2 === 0;
    if (!isVisible) return;

    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'red';
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 50px sans-serif';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const scale = 1 + Math.sin(now / 100) * 0.1;
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.scale(scale, scale);

    ctx.fillText('!!!!!! BOSS APPEARING !!!!!!', 0, 0);
    ctx.restore();
}
