import type { Entity, Monster, GroundItem, Effect } from '../../types';
import { COLORS, getStageLength, CLUB_LENGTH, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../constants';
import { GAME_STRATEGY } from './GameStrategy';

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

        // Stage 1: One main crack
        if (hitCount >= 1) {
            ctx.moveTo(w * 0.2, 0); ctx.lineTo(w * 0.5, h * 0.4); ctx.lineTo(w * 0.3, h);
        }
        // Stage 2: Second crack
        if (hitCount >= 2) {
            ctx.moveTo(w * 0.8, 0); ctx.lineTo(w * 0.6, h * 0.5); ctx.lineTo(w * 0.7, h);
        }
        // Stage 3: Cross crack
        if (hitCount >= 3) {
            ctx.moveTo(0, h * 0.3); ctx.lineTo(w, h * 0.7);
        }
        // Stage 4+: More messy cracks
        if (hitCount >= 4) {
            ctx.moveTo(0, h * 0.8); ctx.lineTo(w * 0.4, h * 0.5); ctx.lineTo(w, h * 0.2);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, 0, w, h);
        }
        ctx.stroke();
    }

    ctx.restore();
}

export function drawDragon(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    time: number, state: string,
    stage: number = 1,
    facingVal: number = -1,
    playerPos?: { x: number, y: number }
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
    const armCount = BOSS.LIMBS.ARMS_BASE + (stage - 1) * BOSS.LIMBS.ARMS_PER_STAGE;
    const legCount = BOSS.LIMBS.LEGS_BASE + (stage - 1) * BOSS.LIMBS.LEGS_PER_STAGE;
    const segmentCount = BOSS.LIMBS.SEGMENT_COUNT;
    const segmentLen = BOSS.LIMBS.SEGMENT_LENGTH;

    // Helper to draw a multi-jointed limb pointing towards a target
    const drawLimb = (startX: number, startY: number, tX: number, tY: number, isLeg: boolean, index: number) => {
        ctx.save();
        ctx.translate(startX, startY);

        let curX = 0;
        let curY = 0;

        // Target angle relative to limb start
        const dx = tX - (x + width / 2 + startX * scale * facingVal);
        const dy = tY - (y + height / 2 + startY * scale);
        const baseAngle = Math.atan2(dy, dx * facingVal);

        for (let s = 0; s < segmentCount; s++) {
            const phase = time / 500 + index * 0.5 + s * 0.3;
            const wave = Math.sin(phase) * (isLeg ? 0.2 : 0.4);
            const angle = baseAngle + wave;

            ctx.save();
            ctx.translate(curX, curY);
            ctx.rotate(angle);

            // Segment
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(segmentLen, 0);
            ctx.strokeStyle = strokeColor;
            ctx.stroke();

            // Joint / Muscle
            ctx.beginPath();
            ctx.arc(0, 0, 8 - s * 2, 0, Math.PI * 2);
            ctx.fillStyle = bodyColor;
            ctx.fill();
            ctx.stroke();

            ctx.restore();

            curX += Math.cos(angle) * segmentLen;
            curY += Math.sin(angle) * segmentLen;
        }

        // Paw / Claw at the end
        ctx.save();
        ctx.translate(curX, curY);
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    };

    const tX = playerPos?.x ?? 0;
    const tY = playerPos?.y ?? 0;

    // Draw Arms
    for (let i = 0; i < armCount; i++) {
        const angle = (i / armCount) * Math.PI - Math.PI / 2;
        const ax = Math.cos(angle) * 30;
        const ay = Math.sin(angle) * 60;
        drawLimb(ax, ay, tX, tY, false, i);
    }

    // Draw Legs
    for (let i = 0; i < legCount; i++) {
        const lx = -100 + i * (40 / Math.max(1, legCount - 1));
        const ly = 60;
        drawLimb(lx, ly, tX, tY, true, i + 10);
    }

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

/** Draw the player character with arms, legs, weapon, and optional face image */
export function drawPlayer(
    ctx: CanvasRenderingContext2D,
    p: Entity,
    time: number,
    isMoving: boolean,
    faceImg: HTMLImageElement | null,
    isInvincible: boolean,
    powerups: { bigBullet: number },
    lastSwingTime: number = 0,
    shieldUntil: number = 0,
    aCharged: boolean = false,
    lastMegaSwingTime: number = 0,
    weapon: 'sword' | 'club' = 'club',
    isBlocking: boolean = false,
    isCrouching: boolean = false,
): void {
    const now = Date.now();
    const isShieldActive = shieldUntil > now;
    if (isInvincible && !isShieldActive && Math.floor(time / 100) % 2 === 0) return;

    const walkCycle = isMoving ? Math.sin(time / 100) : 0;
    const armCycle = isMoving ? Math.sin(time / 100 + Math.PI) : 0;
    const { pos } = p;

    // Swing animation: 0.5s duration after lastSwingTime
    const swingElapsed = time - lastSwingTime;
    const isSwinging = swingElapsed < 500;

    // Mega Swing animation: 0.6s duration
    const megaElapsed = time - lastMegaSwingTime;
    const isMegaSwinging = megaElapsed < 600;

    const halfW = p.width / 2;
    const halfH = p.height / 2;

    ctx.save();
    ctx.translate(pos.x + halfW, pos.y);
    if (p.facing === 'left') {
        ctx.scale(-1, 1);
    }
    ctx.translate(-halfW, 0);

    // Draw Charging Aura
    if (aCharged) {
        ctx.save();
        ctx.translate(halfW, halfH);
        ctx.rotate(time / 200);

        // Outer pulsing glow
        ctx.beginPath();
        const pulse = Math.sin(time / 100) * 10;
        ctx.arc(0, 0, (halfW + 30) + pulse, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, halfW + 5, 0, 0, (halfW + 35) + pulse);
        grad.addColorStop(0, 'rgba(255, 215, 0, 0)');
        grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Energy Rays
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        for (let r = 0; r < 8; r++) {
            ctx.rotate(Math.PI / 4);
            ctx.beginPath();
            ctx.moveTo((halfW + 10) + pulse, 0);
            ctx.lineTo((halfW + 30) + pulse, 0);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Draw Shield Effect
    if (isShieldActive) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(halfW, halfH, halfH * 1.5, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(halfW, halfH, halfH, halfW, halfH, halfH * 1.625);
        grad.addColorStop(0, 'rgba(33, 150, 243, 0)');
        grad.addColorStop(1, 'rgba(33, 150, 243, 0.4)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = -time / 20;
        ctx.stroke();
        ctx.restore();
    }

    // Draw Parry Shield
    if (isBlocking) {
        ctx.save();
        ctx.translate(halfW + 15, p.height * 0.5); // Hold it in front

        // Shield shape - premium look
        ctx.fillStyle = '#90A4AE';
        ctx.strokeStyle = '#ECEFF1';
        ctx.lineWidth = 3;

        ctx.beginPath();
        // Modern shield curve
        ctx.moveTo(-15, -20);
        ctx.quadraticCurveTo(0, -25, 15, -20);
        ctx.lineTo(15, 12);
        ctx.quadraticCurveTo(0, 32, -15, 12);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Inner detail
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -12);
        ctx.lineTo(8, -12);
        ctx.moveTo(0, -15);
        ctx.lineTo(0, 15);
        ctx.stroke();

        ctx.restore();
    }

    const isBigBullet = powerups.bigBullet > Date.now();
    const bodyColor = isBigBullet ? '#F44336' : '#D32F2F';

    // Legs
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(2, p.width * 0.2);
    ctx.lineCap = 'round';

    const legY = p.height * 0.75;
    const legLen = p.height * 0.25;
    const legX1 = p.width * 0.3;
    const legX2 = p.width * 0.7;

    ctx.save();
    ctx.translate(legX1, legY);
    ctx.rotate(walkCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, legLen); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(legX2, legY);
    ctx.rotate(-walkCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, legLen); ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = bodyColor;
    const bodyY = isCrouching ? p.height * 0.2 : p.height * 0.375;
    ctx.fillRect(0, bodyY, p.width, p.height - bodyY);

    // Left arm (normal walk swing)
    ctx.lineWidth = Math.max(2, p.width * 0.16);
    ctx.save();
    ctx.translate(p.width * 0.1, p.height * 0.5);
    ctx.rotate(armCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-p.width * 0.3, p.width * 0.3); ctx.stroke();
    ctx.restore();

    // Right arm + Weapon (sword or flail/club)
    if (!isBlocking) {
        if (weapon === 'sword') {
            // ── SWORD WEAPON ──
            const attackDir = p.attackDir || p.facing || 'right';

            const normalDuration = 500;
            const megaDuration = 700;
            const duration = isMegaSwinging ? megaDuration : normalDuration;
            const elapsed_sw = isMegaSwinging ? megaElapsed : swingElapsed;
            const progress = Math.min(1.0, elapsed_sw / duration);


            const isFlipped = p.facing === 'left';
            // Attack direction → angle
            let dirAngle = 0;
            if (attackDir === 'up') dirAngle = -Math.PI / 2;
            else if (attackDir === 'down') dirAngle = Math.PI / 2;
            else if (attackDir === 'left') dirAngle = isFlipped ? 0 : Math.PI;
            else dirAngle = isFlipped ? Math.PI : 0; // right

            if (isMegaSwinging) {
                // -- MEGA CHARGE: 2단계 -- [0~0.55] 360° 2회전 스핀 → [0.55~1.0] 길게 찌르기 --
                ctx.save();
                ctx.translate(halfW, halfH);

                if (progress < 0.55) {
                    // -- Phase 1: 스핀 (2회전) --
                    const spinProgress = progress / 0.55;
                    const spinAngle = spinProgress * Math.PI * 4; // 2회전
                    const thrustOffset = Math.sin(spinProgress * Math.PI * 2) * 28;

                    // 트레일 아크
                    if (spinProgress > 0.1) {
                        const trailCount = 5;
                        const sweepAngle = Math.min(Math.PI * 2, spinProgress * Math.PI * 7);
                        for (let tIdx = 0; tIdx < trailCount; tIdx++) {
                            const alpha = (1 - tIdx / trailCount) * Math.max(0, 1.4 - spinProgress * 1.8);
                            if (alpha <= 0) continue;
                            ctx.save();
                            ctx.globalAlpha = alpha * 0.75;
                            const trailRad = 132 + thrustOffset + tIdx * 8;
                            ctx.strokeStyle = tIdx % 2 === 0 ? '#FF6B35' : '#FFFFFF';
                            ctx.lineWidth = 9 - tIdx;
                            ctx.lineCap = 'round';
                            ctx.beginPath();
                            ctx.arc(0, 0, trailRad, spinAngle - sweepAngle, spinAngle);
                            ctx.stroke();
                            ctx.restore();
                        }
                        ctx.globalAlpha = 1;
                        // 충격파 링
                        if (spinProgress > 0.3 && spinProgress < 0.85) {
                            const burstA = Math.sin((spinProgress - 0.3) / 0.55 * Math.PI);
                            ctx.save();
                            ctx.globalAlpha = burstA * 0.45;
                            ctx.strokeStyle = '#FF8C42';
                            ctx.lineWidth = 4;
                            ctx.beginPath();
                            ctx.arc(0, 0, 140 + thrustOffset, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.restore();
                            ctx.globalAlpha = 1;
                        }
                    }
                    ctx.rotate(spinAngle);
                    ctx.translate(thrustOffset, 0);
                    drawDragonSlayer(ctx, 144, true, spinProgress, isBigBullet);

                } else {
                    // -- Phase 2: 길게 찌르기 (thrust) 후 회수 --
                    const thrustProgress = (progress - 0.55) / 0.45;
                    let thrustDist = 0;
                    if (thrustProgress < 0.35) {
                        // 빠른 찌르기: easeOut cubic
                        const t2 = thrustProgress / 0.35;
                        thrustDist = (1 - Math.pow(1 - t2, 3)) * 130;
                    } else if (thrustProgress < 0.6) {
                        // 유지
                        thrustDist = 130;
                    } else {
                        // 회수: easeIn
                        const t2 = (thrustProgress - 0.6) / 0.4;
                        thrustDist = 130 * (1 - Math.pow(t2, 2));
                    }

                    // 찌르기 방향으로 이동
                    ctx.rotate(dirAngle);
                    ctx.translate(thrustDist, 0);

                    // 찌르기 속도감 트레일
                    if (thrustDist > 15) {
                        const ta = Math.min(thrustProgress / 0.35, 1)
                            * (1 - Math.max(0, (thrustProgress - 0.6) / 0.4)) * 0.7;
                        ctx.save();
                        ctx.globalAlpha = ta;
                        ctx.strokeStyle = '#FFD580';
                        ctx.lineWidth = 8;
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(-thrustDist * 0.65, -7);
                        ctx.lineTo(-12, -7);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(-thrustDist * 0.65, 7);
                        ctx.lineTo(-12, 7);
                        ctx.stroke();
                        ctx.restore();
                        ctx.globalAlpha = 1;
                    }
                    // 피크 임팩트 플래시
                    if (thrustProgress > 0.3 && thrustProgress < 0.62) {
                        const flashA = Math.sin((thrustProgress - 0.3) / 0.32 * Math.PI);
                        ctx.save();
                        ctx.globalAlpha = flashA * 0.7;
                        ctx.fillStyle = '#FFDD00';
                        ctx.shadowColor = '#FFA000';
                        ctx.shadowBlur = 22;
                        ctx.beginPath();
                        ctx.arc(140, 0, 24, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                        ctx.globalAlpha = 1;
                    }

                    drawDragonSlayer(ctx, 144, true, progress, isBigBullet);
                }

                ctx.restore();

            } else if (isSwinging) {
                // ── NORMAL ATTACK: Thrust (찌르기) + Shake + Retract ──
                // Phase 0.00-0.30: thrust out rapidly
                // Phase 0.30-0.55: shake up/down violently
                // Phase 0.55-1.00: retract back
                ctx.save();
                ctx.translate(halfW, halfH); // shoulder

                let thrustDist = 0;   // how far forward blade extends
                let shakeY = 0;       // vertical shake offset

                if (progress < 0.30) {
                    // Rapid thrust forward: easeOut cubic
                    const t = progress / 0.30;
                    const ease = 1 - Math.pow(1 - t, 3);
                    thrustDist = ease * 80;
                } else if (progress < 0.55) {
                    // Violent shake: full extension + shake
                    thrustDist = 80;
                    const shakeT = (progress - 0.30) / 0.25;
                    shakeY = Math.sin(shakeT * Math.PI * 5) * 14; // 5 rapid oscillations
                } else {
                    // Retract quickly: easeIn cubic
                    const t = (progress - 0.55) / 0.45;
                    const ease = Math.pow(t, 2);
                    thrustDist = 80 * (1 - ease);
                }

                // Small impact flash at peak
                if (progress > 0.27 && progress < 0.42) {
                    const flashA = Math.sin((progress - 0.27) / 0.15 * Math.PI);
                    ctx.save();
                    ctx.globalAlpha = flashA * 0.5;
                    ctx.fillStyle = '#FFD580';
                    const fx = Math.cos(dirAngle) * (thrustDist + 110);
                    const fy = Math.sin(dirAngle) * (thrustDist + 110);
                    ctx.beginPath();
                    ctx.arc(fx, fy, 16, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    ctx.globalAlpha = 1;
                }

                // Thrust trail lines
                if (thrustDist > 5) {
                    const trailA = Math.min(progress / 0.3, 1) * (1 - Math.max(0, (progress - 0.55) / 0.45)) * 0.5;
                    ctx.save();
                    ctx.globalAlpha = trailA;
                    ctx.strokeStyle = '#C8C8D8';
                    ctx.lineWidth = 6;
                    ctx.lineCap = 'round';
                    const sx = Math.cos(dirAngle) * 5;
                    const sy = Math.sin(dirAngle) * 5;
                    const ex = Math.cos(dirAngle) * (thrustDist + 30);
                    const ey = Math.sin(dirAngle) * (thrustDist + 30);
                    ctx.beginPath(); ctx.moveTo(sx, sy - 5); ctx.lineTo(ex, ey - 5); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(sx, sy + 5); ctx.lineTo(ex, ey + 5); ctx.stroke();
                    ctx.restore();
                    ctx.globalAlpha = 1;
                }

                // Position sword: rotated to dir, translated forward by thrustDist, shakeY applied perpendicular
                const perpX = -Math.sin(dirAngle) * shakeY;
                const perpY = Math.cos(dirAngle) * shakeY;
                ctx.rotate(dirAngle);
                ctx.translate(thrustDist + perpX, perpY);
                drawDragonSlayer(ctx, 132, false, progress, isBigBullet); // 110 * 1.2 = 132
                ctx.restore();

            } else {
                // ── IDLE: Dragon Slayer dragged/held diagonally on back ──
                ctx.save();
                ctx.translate(halfW, halfH);
                // Held at ~-70° (up-right) with subtle breathing bob
                const idleAngle = -Math.PI * 0.38 + Math.sin(time / 800) * 0.05;
                ctx.rotate(idleAngle);
                drawDragonSlayer(ctx, 132, false, 0, isBigBullet); // 110 * 1.2 = 132
                ctx.restore();
            }

            // ── Dragon Slayer (Berserk Guts style) ──
            // A massive, thick, wide, BLUNT-tipped cleaver sword.
            function drawDragonSlayer(
                ctx2: CanvasRenderingContext2D,
                length: number,
                mega: boolean,
                prog: number,
                big: boolean
            ) {
                const bladeColor = mega ? '#9AA8C0' : (big ? '#C8A040' : '#8890A0');
                const rimColor = mega ? '#D0DFFF' : (big ? '#FFE090' : '#C0C8D8');
                const guardColor = mega ? '#4060A0' : (big ? '#8B6914' : '#555566');
                const gripColor = mega ? '#2A3A5A' : '#3A2010';

                ctx2.save();

                // Mega glint flicker
                if (mega && prog > 0.1) {
                    const glintA = Math.abs(Math.sin(prog * Math.PI * 8)) * 0.9;
                    ctx2.save();
                    ctx2.globalAlpha = glintA;
                    ctx2.shadowColor = '#FF8C42';
                    ctx2.shadowBlur = 18;
                    ctx2.strokeStyle = '#FFDDAA';
                    ctx2.lineWidth = 2.5;
                    ctx2.beginPath();
                    ctx2.moveTo(10, 0);
                    ctx2.lineTo(length * 0.7, 0);
                    ctx2.stroke();
                    ctx2.restore();
                    ctx2.globalAlpha = 1;
                }

                // ─── BLADE (Dragon Slayer style) ───
                // Extremely wide, thick, rectangle-ish with very slight taper and BLUNT end
                const bladeW = mega ? 22 : 18;  // half-width at base
                const tipW = mega ? 14 : 11;  // half-width at blunt tip (thick)

                ctx2.beginPath();
                ctx2.moveTo(0, -bladeW);              // base top
                ctx2.lineTo(length, -tipW);           // tip top – slight taper
                ctx2.lineTo(length + 4, 0);           // blunt flat tip center
                ctx2.lineTo(length, tipW);            // tip bottom
                ctx2.lineTo(0, bladeW);               // base bottom
                ctx2.closePath();
                ctx2.fillStyle = bladeColor;
                ctx2.fill();

                // Dark outline
                ctx2.strokeStyle = '#222';
                ctx2.lineWidth = 2;
                ctx2.stroke();

                // ─── Surface details ───
                // Center fuller groove (horizontal scratch lines)
                ctx2.save();
                ctx2.strokeStyle = rimColor;
                ctx2.lineWidth = 2;
                ctx2.globalAlpha = 0.55;
                ctx2.beginPath();
                ctx2.moveTo(6, -bladeW * 0.3);
                ctx2.lineTo(length * 0.9, -tipW * 0.3);
                ctx2.stroke();
                ctx2.beginPath();
                ctx2.moveTo(6, bladeW * 0.3);
                ctx2.lineTo(length * 0.9, tipW * 0.3);
                ctx2.stroke();
                // Top-edge bright strip
                ctx2.lineWidth = 3;
                ctx2.globalAlpha = 0.75;
                ctx2.beginPath();
                ctx2.moveTo(4, -bladeW + 2);
                ctx2.lineTo(length - 2, -tipW + 2);
                ctx2.stroke();
                // Nicks / scratches (battle damage)
                ctx2.globalAlpha = 0.35;
                ctx2.strokeStyle = '#000';
                ctx2.lineWidth = 1.5;
                for (let n = 0; n < 5; n++) {
                    const nx = 20 + n * (length * 0.15);
                    const side = n % 2 === 0 ? -1 : 1;
                    ctx2.beginPath();
                    ctx2.moveTo(nx, side * (bladeW - 3));
                    ctx2.lineTo(nx + 4, side * (bladeW - 8));
                    ctx2.stroke();
                }
                ctx2.restore();

                // ─── CROSSGUARD (wide, brutal) ───
                const guardW = mega ? 34 : 28;
                const guardLen = mega ? 16 : 12;
                ctx2.fillStyle = guardColor;
                ctx2.strokeStyle = '#111';
                ctx2.lineWidth = 2;
                ctx2.beginPath();
                ctx2.roundRect(-guardLen / 2, -guardW / 2, guardLen, guardW, 2);
                ctx2.fill();
                ctx2.stroke();
                // Rivets on guard
                ctx2.fillStyle = '#999';
                ctx2.beginPath(); ctx2.arc(-2, -guardW * 0.3, 3, 0, Math.PI * 2); ctx2.fill();
                ctx2.beginPath(); ctx2.arc(-2, guardW * 0.3, 3, 0, Math.PI * 2); ctx2.fill();

                // ─── GRIP (two-handed, long) ───
                const gripLen = 28;
                ctx2.save();
                ctx2.translate(-guardLen / 2, 0);
                // Wrapped leather
                ctx2.strokeStyle = gripColor;
                ctx2.lineWidth = 9;
                ctx2.lineCap = 'square';
                ctx2.beginPath();
                ctx2.moveTo(0, 0);
                ctx2.lineTo(-gripLen, 0);
                ctx2.stroke();
                // Wrapping bands
                ctx2.strokeStyle = 'rgba(0,0,0,0.45)';
                ctx2.lineWidth = 2.5;
                ctx2.lineCap = 'butt';
                for (let g = 1; g <= 5; g++) {
                    const gx = -g * (gripLen / 6);
                    ctx2.beginPath();
                    ctx2.moveTo(gx, -5); ctx2.lineTo(gx, 5); ctx2.stroke();
                }
                ctx2.restore();

                // ─── POMMEL (heavy, rectangular) ───
                const pommelW = mega ? 14 : 11;
                const pommelH = mega ? 10 : 8;
                ctx2.fillStyle = guardColor;
                ctx2.strokeStyle = '#111';
                ctx2.lineWidth = 2;
                ctx2.beginPath();
                ctx2.roundRect(-guardLen / 2 - gripLen - pommelW, -pommelH / 2, pommelW, pommelH, 2);
                ctx2.fill();
                ctx2.stroke();

                ctx2.restore();
            }

        } else {
            // ── CLUB / FLAIL WEAPON ──
            ctx.save();

            const attackDir = p.attackDir || p.facing || 'right';
            const isFlipped = p.facing === 'left';
            let baseAngle = 0;

            if (attackDir === 'up') baseAngle = -Math.PI / 2;
            else if (attackDir === 'down') baseAngle = Math.PI / 2;
            // Handled by flipped scale usually, but let's be safe
            else if (attackDir === 'left') baseAngle = isFlipped ? 0 : Math.PI;
            else if (attackDir === 'right') baseAngle = isFlipped ? Math.PI : 0;

            // Body center-ish shoulder
            ctx.translate(halfW, halfH);
            ctx.rotate(baseAngle);

            const normalDuration = 500;
            const megaDuration = 600;
            const duration = isMegaSwinging ? megaDuration : normalDuration;
            const elapsed = isMegaSwinging ? megaElapsed : swingElapsed;
            const progress = Math.min(1.0, elapsed / duration);

            let rightArmAngle = 0;
            let flailRotation = 0;
            let chainExtensionRatio = 0; // 0 = close to body, 1 = full reach
            let isSpinning = false;
            let spinAngle = 0;

            if (isSwinging || isMegaSwinging) {
                // Attack phases: 0-0.3: Spin around body, 0.3-0.7: Extend, 0.7-1.0: Retract
                if (progress < 0.3) {
                    isSpinning = true;
                    const spinProgress = progress / 0.3;
                    spinAngle = spinProgress * Math.PI * 2;
                    rightArmAngle = -Math.PI / 4 + Math.sin(spinProgress * Math.PI) * 0.2;
                    chainExtensionRatio = 0.2; // Stay close during spin
                } else {
                    // Extend and retract
                    const throwProgress = (progress - 0.3) / 0.7;
                    const throwPhase = Math.sin(throwProgress * Math.PI); // 0 -> 1 -> 0

                    // Swing arc: wider for mega
                    const arcSize = isMegaSwinging ? Math.PI : Math.PI / 3;
                    rightArmAngle = -arcSize / 2 + throwPhase * arcSize;

                    chainExtensionRatio = 0.2 + throwPhase * 0.8;
                    flailRotation = throwPhase * 0.1;
                }
            } else {
                // Idle: Attached to body (behind back)
                rightArmAngle = Math.PI * 0.6; // Pointing down and back
                chainExtensionRatio = 0.1;
            }

            if (isSpinning) {
                ctx.restore(); // Back to player local space to spin around center
                ctx.save();
                ctx.translate(halfW, halfH); // Rotate around body center
                ctx.rotate(spinAngle);

                // Draw spinning chain and ball
                const spinRadius = 40 + (isMegaSwinging ? 20 : 0);
                ctx.strokeStyle = '#9E9E9E';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(spinRadius, 0);
                ctx.stroke();

                drawFlailBall(ctx, spinRadius, 0, time, isMegaSwinging, isBigBullet, progress, isSwinging || isMegaSwinging);
                ctx.restore();
            } else {
                ctx.rotate(rightArmAngle);

                // Arm extension
                const armLen = isSwinging || isMegaSwinging ? 25 : 15;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(armLen, 0);
                ctx.stroke();

                // Handle
                ctx.save();
                ctx.translate(armLen, 0);
                ctx.rotate(flailRotation);
                ctx.strokeStyle = '#4E342E';
                ctx.lineWidth = 10;
                const handleLen = (isSwinging || isMegaSwinging) ? 35 : 10;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(handleLen, 0); ctx.stroke();

                // Chain
                ctx.translate(handleLen, 0);
                const baseChainLen = CLUB_LENGTH;
                const currentChainLen = isMegaSwinging
                    ? (baseChainLen * 0.2 + chainExtensionRatio * baseChainLen * 2.5)
                    : (baseChainLen * 0.2 + chainExtensionRatio * baseChainLen);

                drawChain(ctx, currentChainLen, isMegaSwinging);

                // Ball
                drawFlailBall(ctx, currentChainLen, 0, time, isMegaSwinging, isBigBullet, progress, isSwinging || isMegaSwinging);
                ctx.restore();
                ctx.restore();
            }

            function drawChain(ctx: CanvasRenderingContext2D, length: number, mega: boolean) {
                const segments = 12;
                const segLen = length / segments;
                ctx.strokeStyle = mega ? '#FFD700' : '#9E9E9E';
                ctx.lineWidth = mega ? 7 : 4;
                let lx = 0, ly = 0;
                for (let i = 1; i <= segments; i++) {
                    const rx = i * segLen;
                    const ry = Math.sin((i / segments) * Math.PI) * (isSwinging || isMegaSwinging ? -10 : 5);
                    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
                    ctx.fillStyle = '#757575';
                    ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill();
                    lx = rx; ly = ry;
                }
            }

            function drawFlailBall(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, mega: boolean, big: boolean, p: number, active: boolean) {
                ctx.save();
                ctx.translate(x, y);
                const ballColor = (big || mega) ? '#FFD700' : '#263238';
                ctx.fillStyle = ballColor;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                const ballRadius = mega ? GAME_STRATEGY.WEAPON.MEGA_FLAIL_RADIUS : GAME_STRATEGY.WEAPON.FLAIL_RADIUS;
                ctx.beginPath(); ctx.arc(0, 0, ballRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

                // Spikes
                ctx.fillStyle = (big || mega) ? '#FFF176' : '#546E7A';
                const rotation = t / 150 + (active ? p * 15 : 0);
                for (let s = 0; s < 8; s++) {
                    ctx.save();
                    ctx.rotate(rotation + (s * Math.PI * 2) / 8);
                    ctx.beginPath();
                    ctx.moveTo(ballRadius - 5, -10);
                    ctx.lineTo(ballRadius + ballRadius * 0.8, 0); // Proportional spikes
                    ctx.lineTo(ballRadius - 5, 10);
                    ctx.closePath();
                    ctx.fill(); ctx.stroke();
                    ctx.restore();
                }
                ctx.restore();
            }
        }
    } else {
        // Arm when blocking (holding shield)
        ctx.lineWidth = Math.max(2, p.width * 0.16);
        ctx.save();
        ctx.translate(p.width * 0.7, p.height * 0.5);
        ctx.rotate(0.2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, 4); ctx.stroke();
        ctx.restore();
    }

    // Head
    if (faceImg) {
        ctx.save();
        ctx.beginPath(); ctx.arc(halfW, halfW, halfW, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(faceImg, 0, 0, p.width, p.width);
        ctx.restore();
        ctx.strokeStyle = '#FFCCBC';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(halfW, halfW, halfW, 0, Math.PI * 2); ctx.stroke();
    } else {
        // Plain face: skin color
        ctx.fillStyle = '#FFCCBC';
        ctx.beginPath(); ctx.arc(halfW, halfW, halfW, 0, Math.PI * 2); ctx.fill();

        // Black eyes – indicate facing direction
        const eyeOffsetX = p.facing === 'left' ? -halfW * 0.28 : halfW * 0.28;
        // Both eyes, shifted toward facing side
        ctx.fillStyle = '#1a1a1a';
        const eyeRadius = halfW * 0.16;
        const eyeSpacing = halfW * 0.2;
        // Left eye
        ctx.beginPath(); ctx.arc(halfW + eyeOffsetX - eyeSpacing, halfW * 0.8, eyeRadius, 0, Math.PI * 2); ctx.fill();
        // Right eye
        ctx.beginPath(); ctx.arc(halfW + eyeOffsetX + eyeSpacing, halfW * 0.8, eyeRadius, 0, Math.PI * 2); ctx.fill();
        // Pupils (pointing toward facing)
        ctx.fillStyle = '#FFFFFF';
        const pupilShift = p.facing === 'left' ? -halfW * 0.08 : halfW * 0.08;
        const pupilRadius = eyeRadius * 0.45;
        ctx.beginPath(); ctx.arc(halfW + eyeOffsetX - eyeSpacing + pupilShift, halfW * 0.76, pupilRadius, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(halfW + eyeOffsetX + eyeSpacing + pupilShift, halfW * 0.76, pupilRadius, 0, Math.PI * 2); ctx.fill();
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
    // 중심점 기준으로 scale(-1, 1) 적용 후 다시 복제
    ctx.translate(e.pos.x + e.width / 2, e.pos.y + e.height / 2);
    if (e.vel.x > 0) {
        ctx.scale(-1, 1);
    }
    ctx.translate(-e.width / 2, -e.height / 2);

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

    // Zombie-like head wobble (tilting from the bottom center)
    const wobbleAngle = Math.sin(time / 400) * 0.18;
    if (faceImg) {
        ctx.save();
        ctx.translate(e.width / 2, e.height / 2); // Center of the monster body
        ctx.rotate(wobbleAngle);

        // Circular clipping path
        ctx.beginPath();
        ctx.arc(0, -e.height / 2 + e.height / 2, e.width / 2 - 2, 0, Math.PI * 2);
        ctx.clip();

        // Draw the face image scaled to the monster size
        ctx.drawImage(faceImg, -e.width / 2 + 2, -e.height / 2 + 2, e.width - 4, e.height - 4);
        ctx.restore();

        // Optional: Draw a circular border to make it look cleaner
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
        const nearExpiry = age > 7_000; // flash during last 3 s
        if (nearExpiry && Math.floor(now / 150) % 2 === 0) continue; // blink

        const { x, y } = item.pos;
        const { width, height } = item;
        ctx.save();
        ctx.translate(x, y);

        // Background circle
        const color = item.powerup === 'bigBullet' ? '#FF6F00'
            : item.powerup === 'fastRun' ? '#00C853'
                : item.powerup === 'shield' ? '#2196F3'
                    : item.powerup === 'ammo' ? '#FFEB3B'
                        : '#E53935'; // hp
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Icon label
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

    // Restore default alignments
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
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

    // Slight pulse
    const scale = 1 + Math.sin(now / 100) * 0.1;
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.scale(scale, scale);

    ctx.fillText('!!!!!! BOSS APPEARING !!!!!!', 0, 0);
    ctx.restore();
}
