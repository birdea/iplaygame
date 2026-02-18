import type { Entity, Monster } from '../../types';
import { COLORS, STAGE_LENGTH } from '../../constants';

/** Draw parallax sky, clouds, and hills */
export function drawBackground(ctx: CanvasRenderingContext2D, cameraX: number, time: number): void {
    const width = 1000;

    // Sky
    ctx.fillStyle = COLORS.SKY;
    ctx.fillRect(0, 0, width, 600);

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
        ctx.moveTo(hx, 500);
        ctx.quadraticCurveTo(hx + 200, 200, hx + 400, 500);
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = '#32CD32';
        const hx2 = hillX + i * 800 + 400;
        ctx.beginPath();
        ctx.moveTo(hx2, 500);
        ctx.quadraticCurveTo(hx2 + 150, 300, hx2 + 300, 500);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

/** Draw an SMB3-style block (ground, brick, or question) */
export function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: 'ground' | 'brick' | 'question'): void {
    ctx.save();
    ctx.translate(x, y);

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

    ctx.restore();
}

/** Draw the dragon boss (flipped to face left) */
export function drawDragon(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, time: number, state: string): void {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(-1, 1); // Face left

    const scale = Math.min(width, height) / 300;
    ctx.scale(scale, scale);

    const bodyColor = state === 'punch' ? '#FF1744' : '#1A237E';
    const strokeColor = '#FFFFFF';
    ctx.lineWidth = 5;

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
        for (let i = 0; i < 5; i++) {
            const fx = Math.random() * 60;
            const fy = (Math.random() - 0.5) * 50;
            ctx.beginPath();
            ctx.arc(fx, fy, 15 + Math.random() * 10, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    ctx.restore();
    ctx.restore();
}

/** Draw the player character with arms, legs, club weapon, and optional face image */
export function drawPlayer(
    ctx: CanvasRenderingContext2D,
    p: Entity,
    time: number,
    isMoving: boolean,
    faceImg: HTMLImageElement | null,
    isInvincible: boolean,
    powerups: { bigBullet: number },
    lastSwingTime: number = 0,
): void {
    if (isInvincible && Math.floor(time / 100) % 2 === 0) return;

    const { pos } = p;
    const walkCycle = isMoving ? Math.sin(time / 100) : 0;
    const armCycle = isMoving ? Math.sin(time / 100 + Math.PI) : 0;

    // Swing animation: 0.5s duration after lastSwingTime
    const swingElapsed = time - lastSwingTime;
    const isSwinging = swingElapsed < 500;
    // swingPhase: 0→1→0 arc over 500ms
    const swingPhase = isSwinging ? Math.sin((swingElapsed / 500) * Math.PI) : 0;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    const isBigBullet = powerups.bigBullet > Date.now();
    const bodyColor = isBigBullet ? '#F44336' : '#D32F2F';

    // Legs
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    ctx.save();
    ctx.translate(15, 60);
    ctx.rotate(walkCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 20); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(35, 60);
    ctx.rotate(-walkCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 20); ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(0, 30, 50, 40);

    // Left arm (normal walk swing)
    ctx.lineWidth = 8;
    ctx.save();
    ctx.translate(5, 40);
    ctx.rotate(armCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, 15); ctx.stroke();
    ctx.restore();

    // Right arm + Club
    ctx.save();
    ctx.translate(45, 38);
    // During swing: arm swings up (-PI/2) then down; otherwise normal walk
    const rightArmAngle = isSwinging
        ? -Math.PI * 0.6 + swingPhase * Math.PI * 1.1  // up-swing → down-swing
        : -armCycle * 0.5;
    ctx.rotate(rightArmAngle);
    // Arm
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 15); ctx.stroke();

    // Club (attached to end of right arm)
    ctx.save();
    ctx.translate(15, 15);
    // Club handle
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
    // Club head
    const clubColor = isBigBullet ? '#FF6F00' : '#5D4037';
    ctx.fillStyle = clubColor;
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 26, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Shine on club head
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-3, 23, 4, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Head
    if (faceImg) {
        ctx.save();
        ctx.beginPath(); ctx.arc(25, 25, 25, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(faceImg, 0, 0, 50, 50);
        ctx.restore();
        ctx.strokeStyle = '#FFCCBC';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(25, 25, 25, 0, Math.PI * 2); ctx.stroke();
    } else {
        ctx.fillStyle = '#FFCCBC';
        ctx.beginPath(); ctx.arc(25, 25, 25, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}


/** Draw a monster with limbs, body, and face */
export function drawMonster(
    ctx: CanvasRenderingContext2D,
    e: Entity,
    m: Monster,
    time: number,
    faceImg: HTMLImageElement | null,
): void {
    ctx.save();
    ctx.translate(e.pos.x, e.pos.y);

    // SMB3 Outline
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
    if (faceImg) ctx.drawImage(faceImg, 2, 2, e.width - 4, e.height - 4);

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

/** Draw the boss HP bar */
export function drawBossHPBar(ctx: CanvasRenderingContext2D, boss: Entity): void {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(boss.pos.x, boss.pos.y - 40, boss.width, 10);
    const hpWidth = Math.max(0, (boss.hp! / (boss.maxHP || 100)) * boss.width);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(boss.pos.x, boss.pos.y - 40, hpWidth, 10);
}

export interface HUDData {
    stage: number;
    score: number;
    hp: number;
    powerups: { bigBullet: number; fastRun: number };
}

/** Draw the SMB3-style bottom HUD bar */
export function drawHUD(ctx: CanvasRenderingContext2D, data: HUDData): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 520, 1000, 80);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 530, 980, 60);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px "Courier New"';
    ctx.fillText(`WORLD 1-${data.stage}`, 30, 565);
    ctx.fillText(`SCORE: ${String(data.score).padStart(7, '0')}`, 180, 565);

    // Health icons
    const safeHp = Math.max(0, Math.min(10, data.hp || 0));
    ctx.fillText('LIFE:', 450, 565);
    for (let i = 0; i < safeHp; i++) {
        ctx.fillStyle = '#FF5252';
        ctx.beginPath();
        ctx.arc(520 + i * 25, 555, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Powerup timers
    if (data.powerups.bigBullet > Date.now()) {
        const sec = Math.ceil((data.powerups.bigBullet - Date.now()) / 1000);
        ctx.fillStyle = '#FFD600';
        ctx.fillText(`P-WINGS: ${sec}s`, 750, 555);
    }
    if (data.powerups.fastRun > Date.now()) {
        const sec = Math.ceil((data.powerups.fastRun - Date.now()) / 1000);
        ctx.fillStyle = '#00E676';
        ctx.fillText(`FAST: ${sec}s`, 750, 580);
    }
}

/** Draw the minimap in the top-right corner */
export function drawMinimap(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    minimapWidth: number,
    minimapHeight: number,
    cameraX: number,
    player: Entity,
    boss: Entity | undefined,
): void {
    ctx.save();
    ctx.translate(canvasWidth - minimapWidth - 20, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, minimapWidth, minimapHeight);
    ctx.clip();

    const mScaleX = minimapWidth / STAGE_LENGTH;
    const mScaleY = minimapHeight / 600;
    ctx.scale(mScaleX, mScaleY);
    ctx.translate(-cameraX, 0);

    ctx.fillStyle = '#5D4037';
    ctx.fillRect(cameraX, 500, STAGE_LENGTH + 1000, 100);

    if (boss) {
        ctx.fillStyle = '#FF1744';
        ctx.fillRect(boss.pos.x, boss.pos.y, boss.width, boss.height);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(player.pos.x, player.pos.y, player.width, player.height);

    ctx.restore();
}
