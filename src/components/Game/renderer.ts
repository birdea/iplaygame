import type { Entity, Monster, Bullet } from '../core/types';

export const drawBackground = (ctx: CanvasRenderingContext2D, cameraX: number, _time: number) => {
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 5; i++) {
        const x = (i * 400 - (cameraX * 0.3)) % (ctx.canvas.width + 200);
        const y = 50 + (i * 30);
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.arc(x + 20, y - 10, 25, 0, Math.PI * 2);
        ctx.arc(x + 40, y, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    // Bushes
    ctx.fillStyle = '#2d5a27';
    for (let i = 0; i < 10; i++) {
        const x = (i * 300 - (cameraX * 0.6)) % (ctx.canvas.width + 200);
        const y = 560;
        ctx.beginPath();
        ctx.arc(x, y, 40, Math.PI, 0);
        ctx.arc(x + 30, y - 10, 30, Math.PI, 0);
        ctx.fill();
    }
};

export const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: string) => {
    if (type === 'ground') {
        ctx.fillStyle = '#e5b382';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#c08e5c';
        ctx.strokeRect(x, y, w, h);
    } else if (type === 'brick') {
        ctx.fillStyle = '#9b4d1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#7a3b14';
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#7a3b14';
        ctx.fillRect(x + 2, y + 2, w - 4, h / 2 - 4);
    } else if (type === 'question') {
        ctx.fillStyle = '#f7d002';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#e29c01';
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#e29c01';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('?', x + w / 2, y + h / 2 + 8);
    }
};

export const drawDragon = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number, state: string) => {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);

    const bob = Math.sin(time / 200) * 10;
    const bodyColor = state === 'angry' ? '#ff4040' : '#4ade80';

    // Wings
    ctx.fillStyle = '#166534';
    const wingAngle = Math.sin(time / 100) * 0.5;
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.beginPath();
    ctx.ellipse(-w / 3, -h / 4 + bob, w / 3, h / 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.beginPath();
    ctx.ellipse(w / 3, -h / 4 + bob, w / 3, h / 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, bob, w / 2.5, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -h / 2 + bob, w / 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-w / 10, -h / 1.8 + bob, 5, 0, Math.PI * 2);
    ctx.arc(w / 10, -h / 1.8 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-w / 10, -h / 1.8 + bob, 2, 0, Math.PI * 2);
    ctx.arc(w / 10, -h / 1.8 + bob, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};

export const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    p: Entity,
    time: number,
    isMoving: boolean,
    faceImg: HTMLImageElement | null,
    isInvincible: boolean,
    powerups: { [key: string]: number }
) => {
    if (isInvincible && Math.floor(time / 100) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.pos.x + p.width / 2, p.pos.y + p.height / 2);

    const jumpBob = Math.sin(time / 100) * (isMoving ? 5 : 0);
    const bodyScale = 1 + Math.sin(time / 150) * 0.05;

    // Fast run effect
    if (powerups.fastRun > Date.now()) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
    }

    // Body
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(-p.width / 2, -p.height / 2 + jumpBob, p.width, p.height * bodyScale, 8);
    ctx.fill();

    // Face / Photo
    if (faceImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -p.height / 2 + 20 + jumpBob, 15, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(faceImg, -15, -15 - p.height / 2 + 20 + jumpBob, 30, 30);
        ctx.restore();
    } else {
        ctx.fillStyle = '#fee2e2';
        ctx.beginPath();
        ctx.arc(0, -p.height / 2 + 20 + jumpBob, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
};

export const drawMonster = (
    ctx: CanvasRenderingContext2D,
    e: Entity,
    m: Monster,
    time: number,
    faceImg: HTMLImageElement | null
) => {
    const x = e.pos.x;
    const y = e.pos.y;
    const w = e.width;
    const h = e.height;

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);

    const squish = 1 + Math.sin(time / 200) * 0.1;

    if (m.monsterType === 'fly') {
        // Wings
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const wingX = Math.sin(time / 50) * 10;
        ctx.beginPath();
        ctx.ellipse(-w / 2 + wingX, -h / 4, 15, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(w / 2 - wingX, -h / 4, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = m.monsterType === 'skinny' ? '#ec4899' : m.monsterType === 'fat' ? '#8b5cf6' : '#f97316';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h * squish, 8);
    ctx.fill();

    if (faceImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -h / 4, 10, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(faceImg, -10, -10 - h / 4, 20, 20);
        ctx.restore();
    }

    ctx.restore();
};

export const drawBullets = (ctx: CanvasRenderingContext2D, bullets: Bullet[]) => {
    bullets.forEach(b => {
        ctx.fillStyle = b.isEnemy ? '#ff0000' : '#4ade80';
        const size = b.isBig ? 15 : 6;
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, size, 0, Math.PI * 2);
        ctx.fill();

        if (b.isBig) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
};

export const drawBossHPBar = (ctx: CanvasRenderingContext2D, boss: Entity) => {
    const barW = 200;
    const barH = 15;
    const x = boss.pos.x - 50;
    const y = boss.pos.y - 30;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, barW, barH);

    // Current HP
    const hpRatio = (boss as any).hp / 100;
    ctx.fillStyle = hpRatio > 0.3 ? '#4ade80' : '#ef4444';
    ctx.fillRect(x, y, barW * hpRatio, barH);
};

export const drawHUD = (ctx: CanvasRenderingContext2D, data: {
    stage: number,
    score: number,
    hp: number,
    powerups: { [key: string]: number }
}) => {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(20, 20, 250, 100);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE: 1-${data.stage}`, 40, 50);
    ctx.fillText(`SCORE: ${String(data.score).padStart(6, '0')}`, 40, 80);

    // Life icons
    ctx.fillText('LIFE:', 40, 110);
    for (let i = 0; i < data.hp; i++) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(110 + i * 25, 103, 8, 0, Math.PI * 2);
        ctx.fill();
    }
};

export const drawMinimap = (
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    mW: number,
    mH: number,
    _cameraX: number,
    player: Entity,
    boss?: Entity
) => {
    const x = canvasW - mW - 20;
    const y = 20;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, mW, mH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(x, y, mW, mH);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(mW / 3000, mH / 600); // Using 3000 as approx level width

    // Player in minimap
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(player.pos.x, player.pos.y, 100, 100);

    // Boss in minimap
    if (boss) {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(boss.pos.x, boss.pos.y, 200, 200);
    }

    ctx.restore();
};
