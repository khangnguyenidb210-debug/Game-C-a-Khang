/**
 * ENGINE & CONFIG
 */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let ROWS, COLS, TILE_SIZE;
let maze = [];

let player = {
    x: 1.5, y: 1.5,
    isCoffee: false, isGhost: false, isShield: false, isUlt: false,
    ultEnd: 0, roadEnd: 0, shieldEnd: 0, ghostEnd: 0, coffeeEnd: 0,
    khangDashCount: 0, khangTraps: 5,
    isMedalSpeed: false, medalSpeedEnd: 0,
    isDelayed: false, delayEnd: 0,
    isParrying: false, parryEnd: 0,
    isInvincible: false, invincibleEnd: 0,
    isParrySuccess: false
};

let bots = [], particles = [], decoys = [], trails = [], shockwaves = [], traps = [];
let gameActive = false, gamePaused = false, pauseStart = 0, startTime = 0, selectedChar = 'khang', gameMode = 'normal', currentLevel = 1;
let selectedBot = 'quyen';
let yCD = 0, uCD = 0, iCD = 0, oCD = 0, freezeEnd = 0, lastBotSpawnTime = 0;
let shakeAmount = 0, showRoad = false;
let alarmSoundPlaying = false;

const COOLDOWNS = {
    khang: { y: 3000, u: 10000, i: 5000, o: 15000 },
    dang: { y: 10000, u: 8000, i: 14000, o: 20000 },
    loi: { y: 7000, u: 10000, i: 4000, o: 18000 }
};

const keys = { w: false, a: false, s: false, d: false };
const links = { quyen: "https://www.onlinegdb.com/s/classroom/CWmpsFWGq",
                tin: "https://oj.vnoi.info/organization/cbl/problems", 
                luom: "http://nguyentran.ddns.net:82/contest"
}

function setPauseOverlay(show) {
    const overlay = document.getElementById('pause-overlay');
    if (!overlay) return;
    overlay.classList.toggle('hidden', !show);
}

function shiftTimers(delta) {
    startTime += delta;
    yCD += delta; uCD += delta; iCD += delta; oCD += delta;
    freezeEnd += delta;
    lastBotSpawnTime += delta;
    player.ultEnd += delta;
    player.roadEnd += delta;
    player.shieldEnd += delta;
    player.ghostEnd += delta;
    player.coffeeEnd += delta;
    player.medalSpeedEnd += delta;
    player.delayEnd += delta;
    player.parryEnd += delta;
    player.invincibleEnd += delta;
    traps.forEach(t => t.life += delta);
    decoys.forEach(d => d.lifeEnd += delta);
    bots.forEach(b => {
        b.nextPathUpdate += delta;
        b.delayUntil += delta;
        b.superRageStart += delta;
        b.superRageEnd += delta;
        b.rageUntil += delta;
    });
}

function resetInputKeys() {
    Object.keys(keys).forEach(key => keys[key] = false);
}

function pauseGame() {
    if (!gameActive || gamePaused) return;
    gamePaused = true;
    pauseStart = Date.now();
    gameActive = false;
    resetInputKeys();
    setPauseOverlay(true);
    playSfx(220, 'triangle', 0.25, 0.1);
}

function resumeGame() {
    if (!gamePaused) return;
    const delta = Date.now() - pauseStart;
    shiftTimers(delta);
    gamePaused = false;
    gameActive = true;
    setPauseOverlay(false);
    playSfx(440, 'triangle', 0.2, 0.12);
    update();
}

function togglePause() {
    if (!gameActive && !gamePaused) return;
    if (gamePaused) resumeGame();
    else pauseGame();
}

/**
 * SOUND ENGINE
 */
let audioCtx = null;
function playSfx(f, t, d, v = 0.1, s = 0) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = t;
        o.frequency.setValueAtTime(f, audioCtx.currentTime);
        if (s) o.frequency.exponentialRampToValueAtTime(s, audioCtx.currentTime + d);
        g.gain.setValueAtTime(v, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        o.stop(audioCtx.currentTime + d);
    } catch (e) { }
}

// Cảnh báo phẫn nộ
function playAlarm() {
    if (alarmSoundPlaying) return;
    alarmSoundPlaying = true;
    playSfx(600, 'square', 0.5, 0.05, 800);
    setTimeout(() => { alarmSoundPlaying = false; }, 1000);
}

/**
 * MAZE ENGINE
 */
function initCanvas() {
    TILE_SIZE = Math.min((window.innerWidth - 60) / COLS, (window.innerHeight - 180) / ROWS);
    canvas.width = COLS * TILE_SIZE;
    canvas.height = ROWS * TILE_SIZE;
}

function generateMaze() {
    const baseSize = gameMode === 'normal' ? [13, 21] : [17, 31];
    ROWS = baseSize[0] + (currentLevel === 1 ? 0 : (currentLevel === 2 ? 4 : 8));
    COLS = baseSize[1] + (currentLevel === 1 ? 0 : (currentLevel === 2 ? 6 : 12));

    initCanvas();
    maze = Array(ROWS).fill().map(() => Array(COLS).fill('#'));
    function walk(x, y) {
        maze[y][x] = '.';
        const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => Math.random() - 0.5);
        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1 && maze[ny][nx] === '#') {
                maze[y + dy / 2][x + dx / 2] = '.';
                walk(nx, ny);
            }
        }
    }
    walk(1, 1);
    maze[ROWS - 2][COLS - 2] = 'K';
}

/**
 * PHYSICS
 */
function checkCollision(x, y, ignoreWalls = false) {
    const h = 0.25;
    const l = Math.floor(x - h), r = Math.floor(x + h), t = Math.floor(y - h), b = Math.floor(y + h);
    for (let i = t; i <= b; i++) {
        for (let j = l; j <= r; j++) {
            if (i < 0 || i >= ROWS || j < 0 || j >= COLS) return true;
            if (!ignoreWalls && maze[i][j] === '#') return true;
        }
    }
    return false;
}

function resolveWallStick() {
    if (checkCollision(player.x, player.y)) {
        const dirs = [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]];
        for (let dist = 0.1; dist < 1.5; dist += 0.1) {
            for (let [dx, dy] of dirs) {
                if (!checkCollision(player.x + dx * dist, player.y + dy * dist)) {
                    player.x += dx * dist;
                    player.y += dy * dist;
                    return;
                }
            }
        }
    }
}

/**
 * VISUAL FX
 */
function spawnShockwave(x, y, color) {
    shockwaves.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, r: 0, life: 1.0, color: color });
}

function spawnTrail(x, y, color) {
    trails.push({ x, y, life: 1.0, color });
}

/**
 * PATHFINDING
 */
function getPath(sx, sy, tx, ty) {
    const startX = Math.floor(sx), startY = Math.floor(sy);
    const targetX = Math.floor(tx), targetY = Math.floor(ty);
    if (startX === targetX && startY === targetY) return [];
    let q = [[startX, startY]], p = {}, v = new Set([`${startX},${startY}`]);
    while (q.length > 0) {
        let [cx, cy] = q.shift();
        if (cx === targetX && cy === targetY) {
            let path = [];
            let curr = `${cx},${cy}`;
            while (curr) {
                path.push(curr.split(',').map(Number));
                curr = p[curr];
            }
            return path.reverse();
        }
        for (let [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            let nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`;
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && maze[ny][nx] !== '#' && !v.has(k)) {
                v.add(k);
                p[k] = `${cx},${cy}`;
                q.push([nx, ny]);
            }
        }
    }
    return [];
}

/**
 * SKILLS SYSTEM
 */
function useY() {
    const now = Date.now();
    if (now < yCD || player.isDelayed) return;
    if (selectedChar === 'khang') {
        const isUlt = player.isUlt;
        let dx = keys.a ? -1 : (keys.d ? 1 : 0), dy = keys.w ? -1 : (keys.s ? 1 : 0);
        if (!dx && !dy) dy = -1;
        for (let i = 0; i < 8; i++) {
            let nx = player.x + dx * 0.4, ny = player.y + dy * 0.4;
            if (!checkCollision(nx, ny)) {
                spawnTrail(player.x, player.y, isUlt ? 'rgba(255,255,255,0.6)' : 'rgba(34,197,94,0.3)');
                player.x = nx;
                player.y = ny;
            }
        }
        if (isUlt) {
            player.khangDashCount++;
            if (player.khangDashCount < 2) yCD = now + 400;
            else { player.khangDashCount = 0; yCD = now + 1500; }
        } else yCD = now + COOLDOWNS.khang.y;
        playSfx(600, 'sine', 0.2);
    } else if (selectedChar === 'dang') {
        player.isCoffee = true;
        player.coffeeEnd = now + 4000;
        yCD = now + COOLDOWNS.dang.y;
        showRoad = true;
        player.roadEnd = now + 5000;
        playSfx(800, 'triangle', 0.4);
    } else if (selectedChar === 'loi') {
        let dx = keys.a ? -1 : (keys.d ? 1 : 0), dy = keys.w ? -1 : (keys.s ? 1 : 0);
        if (!dx && !dy) dy = -1;
        const blinkDist = 3.5;
        spawnShockwave(player.x, player.y, 'rgba(99,102,241,0.5)');
        for (let d = blinkDist; d >= 0; d -= 0.5) {
            let tx = player.x + dx * d, ty = player.y + dy * d;
            if (!checkCollision(tx, ty)) { player.x = tx; player.y = ty; break; }
        }
        spawnShockwave(player.x, player.y, '#6366f1');
        yCD = now + COOLDOWNS.loi.y;
        playSfx(800, 'sine', 0.1);
    }
}

function useU() {
    if (Date.now() < uCD || player.isDelayed) return;
    const now = Date.now();
    shakeAmount = 10;
    if (selectedChar === 'khang') {
        freezeEnd = now + 4000;
        spawnShockwave(player.x, player.y, 'rgba(255,255,255,0.5)');
        playSfx(300, 'square', 0.4);
    } else if (selectedChar === 'dang') {
        bots.forEach(b => {
            let dx = b.x - player.x, dy = b.y - player.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 6) {
                b.x += (dx / d) * 3;
                b.y += (dy / d) * 3;
                b.delayUntil = now + 3000;
            }
        });
        bots.forEach(b => {
            if (checkCollision(b.x, b.y)) {
                b.x -= (dx / d) * 3;
                b.y -= (dy / d) * 3;
            }
        });
        spawnShockwave(player.x, player.y, 'rgba(6,182,212,0.8)');
        playSfx(200, 'sine', 0.5, 0.2, 50);
    } else if (selectedChar === 'loi') {
        freezeEnd = now + 3000;
        player.isShield = true;
        player.shieldEnd = now + 5000;
        player.isMedalSpeed = true;
        player.medalSpeedEnd = now + 2000;
        bots.forEach(b => {
            b.superRageStart = now + 3000;
            b.superRageEnd = now + 6000;
        });
        spawnShockwave(player.x, player.y, '#fbbf24');
        playSfx(400, 'square', 0.4);
    }
    uCD = now + COOLDOWNS[selectedChar].u;
}

function useI() {
    const now = Date.now();
    if (player.isDelayed) return;
    if (selectedChar === 'khang' && player.isUlt) {
        if (player.khangTraps > 0) {
            traps.push({ x: player.x, y: player.y, life: now + 10000 });
            player.khangTraps--;
            document.getElementById('trap-counter').innerText = `BẪY CÒN LẠI: ${player.khangTraps}`;
            playSfx(900, 'sine', 0.1);
            return;
        }
    }
    if (now < iCD) return;
    if (selectedChar === 'khang') {
        decoys.push({ x: player.x, y: player.y, lifeEnd: now + 6000 });
        playSfx(700, 'sine', 0.3);
    } else if (selectedChar === 'dang') { // parry skill
        player.parryEnd = now + 2000;
        player.isDelayed = true;
        player.isParrying = true;
        playSfx(1000, 'triangle', 0.4);
    } else if (selectedChar === 'loi') {
        for (let i = 0; i < 2; i++) decoys.push({
            x: player.x + (Math.random() - 0.5),
            y: player.y + (Math.random() - 0.5),
            lifeEnd: now + 5000
        });
        playSfx(600, 'sawtooth', 0.2);
    }
    iCD = now + COOLDOWNS[selectedChar].i;
}

function useO() {
    if (Date.now() < oCD || player.isDelayed) return;
    const now = Date.now();
    shakeAmount = 40;
    if (selectedChar === 'dang') {
        // ĐĂNG ULT: 3x Speed, Xuyên Bot
        player.isUlt = true;
        player.isGhost = true;
        player.ultEnd = now + 3000;
        player.ghostEnd = now + 3000;
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#06b6d4' : '#fff');
                playSfx(100 + i * 100, 'sawtooth', 0.2, 0.3);
            }, i * 120);
        }
    } else if (selectedChar === 'khang') {
        player.isUlt = true;
        player.ultEnd = now + 6000;
        player.khangTraps = 5;
        document.getElementById('trap-counter').classList.remove('hidden');
        document.getElementById('trap-counter').innerText = `BẪY CÒN LẠI: 5`;
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, 'rgba(255,255,255,0.8)');
                playSfx(500 - i * 40, 'square', 0.3, 0.2);
            }, i * 150);
        }
    } else if (selectedChar === 'loi') {
        bots.forEach(b => {
            b.x += (b.x - player.x) * 4;
            b.y += (b.y - player.y) * 4;
            b.delayUntil = now + 5000;
        });
        spawnShockwave(player.x, player.y, '#6366f1');
        playSfx(80, 'sawtooth', 1.0, 0.5, 400);
    }
    oCD = now + COOLDOWNS[selectedChar].o;
}

/**
 * GAME LOOP
 */
function update() {
    if (!gameActive) return;
    const now = Date.now();
    const elapsed = now - startTime;
    const isHard = gameMode === 'hard';

    // BOT STATES
    const rageCycle = 15000;
    const rageDuration = 5000;
    const isCommonRage = elapsed > 10000 && (elapsed % rageCycle) > (rageCycle - rageDuration);

    // BOT Specialty Logic
    if (selectedBot === 'quyen' && elapsed > 12500) {
        const delayLen = isHard ? 4500 : 3000;
        if (Math.floor(elapsed / 1000) % 10 === 0 && !player.isDelayed && now > player.delayEnd + 5000) {
            player.isDelayed = true;
            player.delayEnd = now + delayLen;
            document.getElementById('warning-flash').classList.add('delay-warning');
            playSfx(120, 'square', 0.5, 0.3);
        }
    }
    if (now > player.delayEnd) {
        player.isDelayed = false;
        document.getElementById('warning-flash').classList.remove('delay-warning');
    }

    let isLuomSuperRage = false;
    if (selectedBot === 'luom' && elapsed > 20000) {
        const luomDur = isHard ? 5000 : 3000;
        if ((elapsed % 20000) < luomDur) isLuomSuperRage = true;
    }

    const statusEl = document.getElementById('bot-status');
    if (isCommonRage || isLuomSuperRage) {
        statusEl.classList.remove('opacity-0');
        statusEl.innerText = isLuomSuperRage ? "MR LƯỢM CỰC HẠN (3X SPEED!)" : "BOT PHẪN NỘ! (2X SPEED)";
        playAlarm();
    } else { statusEl.classList.add('opacity-0'); }

    // SPAWN
    const maxBots = isHard ? [5, 10, 20][currentLevel - 1] : [3, 5, 7][currentLevel - 1];
    const spawnInterval = isHard ? 2500 : 4000;
    if (elapsed > 2000 && (bots.length < maxBots) && (now - lastBotSpawnTime > spawnInterval)) {
        bots.push({
            x: 1.5, y: 1.5, delayUntil: now + 500, nextPathUpdate: 0,
            currentPath: [], rageUntil: 0,
            superRageStart: 0, superRageEnd: 0
        });
        spawnShockwave(1.5, 1.5, '#ef4444');
        lastBotSpawnTime = now;
    }

    // PLAYER MOVE
    let baseSpd = isHard ? 0.13 : 0.11;
    let mult = 1;
    if (player.isDelayed || player.isParrying) mult = 0;
    else if (player.isParrySuccess) {
        mult = 1.5;
        player.isParrySuccess = false;
        iCD = Math.max(iCD - COOLDOWNS[selectedChar].i / 2, now);
    }
    else {
        if (player.isCoffee) mult *= 1.6;
        if (player.isMedalSpeed) mult *= 2.0;
        if (player.isUlt) mult *= (selectedChar === 'dang' ? 3 : 1.6);
    }
    let pSpd = baseSpd * mult;
    if (pSpd > 0) {
        if (keys.w && !checkCollision(player.x, player.y - pSpd)) player.y -= pSpd;
        if (keys.s && !checkCollision(player.x, player.y + pSpd)) player.y += pSpd;
        if (keys.a && !checkCollision(player.x - pSpd, player.y)) player.x -= pSpd;
        if (keys.d && !checkCollision(player.x + pSpd, player.y)) player.x += pSpd;
    }
    resolveWallStick();

    // BOT MOVE
    let bSpdBase = (isHard ? 0.09 : 0.05) + (currentLevel * 0.015);
    if (selectedBot === 'tin') bSpdBase *= (isHard ? 2.0 : 1.75);
    if (selectedBot === 'quyen' && isHard) bSpdBase *= 1.5;

    bots.forEach(b => {
        const superEnraged = (now > b.superRageStart && now < b.superRageEnd) || isLuomSuperRage;
        let finalBSpd = bSpdBase;
        if (superEnraged) finalBSpd *= 3.0;
        else if (isCommonRage) finalBSpd *= 2.0;

        traps.forEach((t, idx) => {
            if (Math.sqrt((b.x - t.x) ** 2 + (b.y - t.y) ** 2) < 0.5) {
                b.delayUntil = now + 3000;
                traps.splice(idx, 1);
                spawnShockwave(t.x, t.y, '#fff');
                playSfx(200, 'sine', 0.2);
            }
        });

        if (now > freezeEnd && now > (b.delayUntil || 0)) {
            let target = (decoys.length > 0) ? decoys[0] : player;
            if (now > b.nextPathUpdate || b.currentPath.length === 0) {
                b.currentPath = getPath(b.x, b.y, target.x, target.y);
                b.nextPathUpdate = now + (isCommonRage ? 150 : 350);
            }
            if (b.currentPath && b.currentPath.length > 1) {
                let next = b.currentPath[1];
                let tx = next[0] + 0.5, ty = next[1] + 0.5;
                let dx = tx - b.x, dy = ty - b.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d > finalBSpd) { b.x += (dx / d) * finalBSpd; b.y += (dy / d) * finalBSpd; }
                else { b.x = tx; b.y = ty; b.currentPath.shift(); }
            }
        }
        // collision with player
        if (Math.sqrt((player.x - b.x) ** 2 + (player.y - b.y) ** 2) < 0.5) {
            if (player.isShield && now < player.shieldEnd) {
                player.isShield = false;
                b.delayUntil = now + 3000;
                spawnShockwave(player.x, player.y, '#fbbf24');
            } else if (player.isParrying && now < player.parryEnd) {
                freezeEnd = now + 1000;
                player.isInvincible = true;
                player.isParrying = false;
                player.isDelayed = false;
                player.invincibleEnd = now + 2000;
                player.isParrySuccess = true;
                b.delayUntil = now + 6000;
                spawnShockwave(player.x, player.y, '#ffffff');
                bots.forEach(b => {
                    b.superRageStart = now + 3000;
                    b.superRageEnd = now + 6000;
                });
                playSfx(600, 'sawtooth', 0.2);
            } else if (!player.isGhost && freezeEnd < now && (!player.isInvincible || now > player.invincibleEnd)) {
                endGame(false, selectedBot);
            }
        }
    });

    // LEVELING
    if (maze[Math.floor(player.y)][Math.floor(player.x)] === 'K') {
        if (currentLevel < 3) {
            currentLevel++;
            generateMaze();
            bots = [];
            trails = [];
            decoys = [];
            shockwaves = [];
            traps = [];
            startTime = now;
            player.x = 1.5;
            player.y = 1.5;
            playSfx(500, 'sine', 0.5, 0.2, 1200);
            document.getElementById('ui-level-text').innerText = `LEVEL ${currentLevel}`;
        } else endGame(true);
    }

    // CLEANUP
    shockwaves.forEach(s => { s.r += 10; s.life -= 0.025; });
    shockwaves = shockwaves.filter(s => s.life > 0);
    trails.forEach(t => t.life -= 0.06);
    trails = trails.filter(t => t.life > 0);
    traps = traps.filter(t => now < t.life);
    if (shakeAmount > 0) shakeAmount *= 0.92;

    if (now > player.ghostEnd) player.isGhost = false;
    if (now > player.coffeeEnd) player.isCoffee = false;
    if (now > player.shieldEnd) player.isShield = false;
    if (now > player.invincibleEnd) player.isInvincible = false;
    if (now > player.medalSpeedEnd) player.isMedalSpeed = false;
    if (now > player.ultEnd) {
        if (player.isUlt && selectedChar === 'khang') document.getElementById('trap-counter').classList.add('hidden');
        player.isUlt = false;
    }
    if (now > player.roadEnd) showRoad = false;

    if (player.isUlt) {
        let color = selectedChar === 'dang' ? '#06b6d4' : (selectedChar === 'khang' ? '#fff' : '#6366f1');
        spawnTrail(player.x, player.y, color);
    }
    decoys = decoys.filter(d => now < d.lifeEnd);

    updateUI(now);
    draw(isCommonRage || isLuomSuperRage);
    requestAnimationFrame(update);
}

/**
 * RENDER
 */
function drawEntity(x, y, color, eyeColor, isBot = false, isEnraged = false, isSuperEnraged = false) {
    const size = (isBot ? 0.75 : 0.6) * TILE_SIZE;
    if (!isBot && player.isShield && Date.now() < player.shieldEnd) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fbbf24';
        ctx.strokeRect(x * TILE_SIZE - size * 0.8, y * TILE_SIZE - size * 0.8, size * 1.6, size * 1.6);
        ctx.shadowBlur = 0;
    }
    if (isBot && isSuperEnraged) {
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 35;
        ctx.shadowColor = '#ff0000';
    }
    else if (isBot && isEnraged) {
        ctx.fillStyle = '#f97316';
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#f97316';
    }
    else {
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
    }

    ctx.fillRect(x * TILE_SIZE - size / 2, y * TILE_SIZE - size / 2, size, size);
    ctx.shadowBlur = 0;
    ctx.fillStyle = (isBot && (isEnraged || isSuperEnraged)) ? '#fff' : eyeColor;
    ctx.fillRect(x * TILE_SIZE - size * 0.25, y * TILE_SIZE - size * 0.2, size * 0.2, size * 0.2);
    ctx.fillRect(x * TILE_SIZE + size * 0.05, y * TILE_SIZE - size * 0.2, size * 0.2, size * 0.2);
}

function draw(inRage) {
    ctx.save();
    if (shakeAmount > 1) ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (maze[r][c] === '#') {
                let grad = ctx.createLinearGradient(c * TILE_SIZE, r * TILE_SIZE, (c + 1) * TILE_SIZE, (r + 1) * TILE_SIZE);
                grad.addColorStop(0, inRage ? '#450a0a' : '#1e293b');
                grad.addColorStop(1, '#020617');
                ctx.fillStyle = grad;
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (maze[r][c] === 'K') {
                ctx.fillStyle = '#eab308';
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#eab308';
                ctx.beginPath();
                ctx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    traps.forEach(t => {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillRect(t.x * TILE_SIZE - 4, t.y * TILE_SIZE - 4, 8, 8);
        ctx.shadowBlur = 0;
    });

    if (showRoad) {
        const path = getPath(player.x, player.y, COLS - 2, ROWS - 2);
        ctx.strokeStyle = 'rgba(6,182,212,0.6)';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        path.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p[0] * TILE_SIZE + TILE_SIZE / 2, p[1] * TILE_SIZE + TILE_SIZE / 2);
            else ctx.lineTo(p[0] * TILE_SIZE + TILE_SIZE / 2, p[1] * TILE_SIZE + TILE_SIZE / 2);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }

    trails.forEach(t => {
        ctx.globalAlpha = t.life;
        drawEntity(t.x, t.y, t.color, 'transparent');
    });
    ctx.globalAlpha = 1;
    shockwaves.forEach(s => {
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.lineWidth = 6 * s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.globalAlpha = 1;

    let pCol = selectedChar === 'khang' ? '#22c55e' : (selectedChar === 'dang' ? '#06b6d4' : '#6366f1');
    if (player.isUlt && selectedChar === 'dang') pCol = '#fbbf24';
    if (player.isDelayed) pCol = '#475569';
    if (player.isGhost && selectedChar === 'dang') pCol = 'rgba(6, 182, 212, 0.5)';
    drawEntity(player.x, player.y, pCol, (player.isGhost || player.isDelayed) ? 'transparent' : '#000');

    bots.forEach(b => {
        const now = Date.now();
        const superEnraged = (now > b.superRageStart && now < b.superRageEnd) || (selectedBot === 'luom' && ((now - startTime) % 20000 < (gameMode === 'hard' ? 5000 : 3000)) && (now - startTime > 20000));
        let bCol = (selectedBot === 'quyen' ? '#ec4899' : (selectedBot === 'tin' ? '#3b82f6' : '#ef4444'));
        if (now < freezeEnd) bCol = '#fff';
        drawEntity(b.x, b.y, bCol, '#000', true, inRage, superEnraged);
    });

    decoys.forEach(d => drawEntity(d.x, d.y, 'rgba(255,255,255,0.3)', '#000'));
    ctx.restore();
}

function updateUI(now) {
    const s = Math.floor((now - startTime) / 1000);
    document.getElementById('ui-time').innerText = `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const cds = COOLDOWNS[selectedChar];
    const setCD = (id, cur, max) => {
        const el = document.getElementById(id);
        if (el) el.style.height = Math.max(0, (cur - now) / max * 100) + '%';
    };
    setCD('cd-y', yCD, cds.y);
    setCD('cd-u', uCD, cds.u);
    setCD('cd-i', iCD, cds.i);
    setCD('cd-o', oCD, cds.o);
}

function endGame(win, bot) {
    gameActive = false;
    document.getElementById('game-over').classList.remove('hidden');
    if (win) {
        document.getElementById('end-title').innerText = "BẠN THẮNG!";
        document.getElementById('end-title').style.color = "#22c55e";
        document.getElementById('end-subtitle').innerText = "Bạn đã trốn thoát thành công và hãy tận hưởng kỳ nghỉ hè dài đằng đẳng của bạn!";
        playSfx(400, 'sine', 1.0, 0.3, 1500);
    } else {
        // replace the link based on the bot, change link color and make the link hyperlink
        document.getElementById('end-title').innerText = "BỊ BẮT RỒI!";
        document.getElementById('end-subtitle').innerText = "Từ đây đến hết kỳ nghỉ hè của bạn, phải giải tất cả bài tập tại ";
        const linkElement = document.createElement('a');
        linkElement.href = links[bot];
        linkElement.target = "_blank";
        linkElement.style.color = "#3b82f6";
        linkElement.innerText = links[bot];
        document.getElementById('end-subtitle').appendChild(linkElement);
        playSfx(60, 'sawtooth', 0.8, 0.4, 30);
    }
}

window.selectChar = (c) => {
    selectedChar = c;
    ['khang', 'dang', 'loi'].forEach(id => {
        const el = document.getElementById('char-' + id);
        el.style.borderColor = (id === c ? (id === 'khang' ? '#22c55e' : (id === 'dang' ? '#06b6d4' : '#6366f1')) : '#1e293b');
        el.style.backgroundColor = (id === c ? 'rgba(255,255,255,0.05)' : 'transparent');
    });
};

window.selectMode = (m) => {
    gameMode = m;
    document.getElementById('mode-normal').classList.toggle('selected-box', m === 'normal');
    document.getElementById('mode-hard').classList.toggle('selected-box', m === 'hard');
    document.getElementById('ui-mode-badge').innerText = m === 'normal' ? 'CHẾ ĐỘ THƯỜNG' : 'CHẾ ĐỘ HARDCORE (CỰC KHÓ)';
};

window.selectBot = (b) => {
    selectedBot = b;
    ['quyen', 'tin', 'luom'].forEach(id => document.getElementById('bot-' + id).classList.toggle('selected-box', id === b));
    const n = { quyen: 'MISS QUEEN', tin: 'MR TING', luom: 'MR LERM' };
    document.getElementById('ui-bot-badge').innerText = `ĐỐI THỦ: ${n[b]}`;
};

document.getElementById('start-btn').onclick = () => {
    document.getElementById('selection-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    currentLevel = 1;
    generateMaze();
    gameActive = true;
    startTime = Date.now();
    update();
    playSfx(300, 'sine', 0.5, 0.1, 600);
};

window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'escape' || k === 'p') {
        togglePause();
        return;
    }
    if (k in keys) keys[k] = true;
    if (gameActive) {
        if (k === 'y') useY();
        if (k === 'u') useU();
        if (k === 'i') useI();
        if (k === 'o') useO();
    }
});

window.addEventListener('keyup', e => {
    if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false;
});

window.addEventListener('resize', initCanvas);

selectChar('khang');
selectMode('normal');
selectBot('quyen');
