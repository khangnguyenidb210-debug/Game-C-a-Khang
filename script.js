/**
 * ENGINE & CONFIG
 */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const version = "1.0.1 (build 2)";
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
    isParrySuccess: false,
    isSlowed: false, slowEnd: 0,
    isTanGod: false, tanGodEnd: 0,
    isTanSharingan: false, tanSharinganEnd: 0,
    isTanUlt: false, tanUltEnd: 0,
    countKills: 0
};

let bots = [], particles = [], decoys = [], trails = [], shockwaves = [], traps = [];
let gameActive = false, gamePaused = false, pauseStart = 0, startTime = 0, selectedChar = 'khang', gameMode = 'normal', currentLevel = 1;
let selectedBot = 'quyen';
let popupEnd = 0;
let yCD = 0, uCD = 0, iCD = 0, oCD = 0, freezeEnd = 0, lastBotSpawnTime = 0;
let shakeAmount = 0, showRoad = false;
let alarmSoundPlaying = false;
let isRaging = false;

const COOLDOWNS = {
    khang: { y: 4000, u: 10000, i: 5000, o: 15000 },
    dang: { y: 8000, u: 12000, i: 12500, o: 20000 },
    loi: { y: 6000, u: 12000, i: 5000, o: 18000 },
    tan:  { y: 5000, u: 5000, i: 5000, o: 5000 } // dev character
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
    player.slowEnd += delta;
    player.tanGodEnd += delta;
    player.tanSharinganEnd += delta;
    player.tanUltEnd += delta;
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

function playSound(url, vol = 1.0) {
    const audio = new Audio(url);
    audio.volume = vol;
    audio.play().catch(error => console.log("Playback blocked:", error));
}

function stopSound(url) {
    const audio = new Audio(url);
    audio.currentTime = 0;
    audio.pause().catch(error => console.log("Stop blocked:", error));
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
            if (!ignoreWalls && (maze[i][j] === '#' || maze[i][j] === 'a')) return true;
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
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && maze[ny][nx] !== '#' && maze[ny][nx] !== 'a' && !v.has(k)) {
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
            else { player.khangDashCount = 0; yCD = now + 1500 * (selectedBot === 'anh' ? 1.5 : 1); }
        } else yCD = now + COOLDOWNS.khang.y * (selectedBot === 'anh' ? 1.5 : 1);
        playSfx(600, 'sine', 0.2);
    } else if (selectedChar === 'dang') {
        player.isCoffee = true;
        player.coffeeEnd = now + 4000;
        yCD = now + COOLDOWNS.dang.y * (selectedBot === 'anh' ? 1.5 : 1);
        showRoad = true;
        player.roadEnd = now + 4000;
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
        yCD = now + COOLDOWNS.loi.y * (selectedBot === 'anh' ? 1.5 : 1);
        playSound('assets/teleport.mp3', 0.7);
    } else if (selectedChar === 'tan') {
        // GOD MODE: 2x speed + immortal for 5s
        player.isTanGod = true;
        player.tanGodEnd = now + 5000;
        player.isInvincible = true;
        player.invincibleEnd = now + 5000;
        shakeAmount = 20;
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#facc15' : '#fff');
                playSfx(300 + i * 80, 'sine', 0.15, 0.3);
            }, i * 80);
        }
        yCD = now + COOLDOWNS.tan.y * (selectedBot === 'anh' ? 1.5 : 1);
    }
}

function useU() {
    const now = Date.now();
    if (now < uCD || player.isDelayed) return;
    shakeAmount = 10;
    if (selectedChar === 'khang') {
        freezeEnd = now + 4000;
        spawnShockwave(player.x, player.y, 'rgba(255,255,255,0.5)');
        playSound('assets/timestop.mp3', 1.0);
    } else if (selectedChar === 'dang') {
        let isPunchSuccess = false;
        player.countKills = 0;
        bots.forEach(b => {
            let dx = b.x - player.x, dy = b.y - player.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 5) {
                b.x += (dx / d) * 4;
                b.y += (dy / d) * 4;
                b.delayUntil = now + 3000;
                b.isDead = true;
                player.countKills++;
                isPunchSuccess = true;
            }
        });
        bots = bots.filter(b => !b.isDead);
        bots.forEach(b => {
            if (checkCollision(b.x, b.y)) {
                let dirs = [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]];
                for (let dist = 0.1; dist < 2; dist += 0.1) {
                    for (let [dx, dy] of dirs) {
                        if (!checkCollision(b.x + dx * dist, b.y + dy * dist)) {
                            b.x += dx * dist;
                            b.y += dy * dist;
                            break;
                        }
                    }
                }
            }
        });
        if (selectedBot === 'anh') {
            let dir = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (let i = 0; i < 8; i++) {
                let nx = Math.floor(player.x) + dir[i][0], ny = Math.floor(player.y) + dir[i][1];
                if (nx > 0 && nx < COLS-1 && ny > 0 && ny < ROWS-1 && maze[ny][nx] === 'a') {
                    maze[ny][nx] = '.';
                    isPunchSuccess = true;
                }
            }
        }
        if (isPunchSuccess) {
            spawnShockwave(player.x, player.y, 'rgba(16, 219, 255, 0.8)');
            playSound('assets/punchsucess.mp3', 0.5);
        } else playSound('assets/doh-i-missed.mp3', 0.75)

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
    } else if (selectedChar === 'tan') {
        // SHARINGAN: screen red, all bots delayed 10s, then 3x rage for 3s after
        player.isTanSharingan = true;
        player.tanSharinganEnd = now + 10000;
        shakeAmount = 30;
        bots.forEach(b => {
            b.delayUntil = now + 10000;
            b.superRageStart = now + 10000;
            b.superRageEnd = now + 13000;
        });
        playSound('assets/sharingan.mp3', 1.0);
        // Flash sharingan image
        const sharinganImg = document.getElementById('sharingan-flash');
        sharinganImg.classList.remove('hidden');
        sharinganImg.style.opacity = 1;
        setTimeout(() => {
            sharinganImg.style.transition = 'opacity 1.2s ease-out';
            sharinganImg.style.opacity = 0;
        }, 300);
        setTimeout(() => {
            sharinganImg.classList.add('hidden');
            sharinganImg.style.transition = 'none';
        }, 1600);
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#ef4444' : '#7f1d1d');
                playSfx(80 + i * 30, 'sawtooth', 0.2, 0.25);
            }, i * 100);
        }
    }
    uCD = now + COOLDOWNS[selectedChar].u * (selectedBot === 'anh' ? 1.5 : 1);
}

function useI() {
    const now = Date.now();
    if (now < iCD || player.isDelayed) return;
    if (selectedChar === 'khang' && player.isUlt) {
        if (player.khangTraps > 0) {
            traps.push({ 
                x: player.x, 
                y: player.y, 
                life: now + 10000,
                isGlowing: true
            });
            player.khangTraps--;
            document.getElementById('trap-counter').innerText = `BẪY CÒN LẠI: ${player.khangTraps}`;
            playSfx(900, 'sine', 0.1);
        } else iCD = now + COOLDOWNS[selectedChar].i * (selectedBot === 'anh' ? 1.5 : 1)
        return;
    }
    if (now < iCD) return;
    if (selectedChar === 'khang') {
        traps.push({ 
            x: player.x, 
            y: player.y, 
            life: now + 10000,
            isGlowing: false
        });
        playSfx(700, 'sine', 0.3);
    } else if (selectedChar === 'dang') {
        player.parryEnd = now + 1500;
        player.isParrying = true;
        playSfx(1000, 'triangle', 0.4);
        spawnShockwave(player.x, player.y, '#cecece');
    } else if (selectedChar === 'loi') {
        decoys.push({ x: player.x, y: player.y, lifeEnd: now + 8000 });
        playSfx(700, 'sine', 0.3);
    } else if (selectedChar === 'tan') {
        // THE SECOND: all bots disappear instantly
        if (bots.length > 0) {
            shakeAmount = 25;
            bots.forEach(b => {
                spawnShockwave(b.x, b.y, '#f97316');
                spawnShockwave(b.x, b.y, '#facc15');
            });
            playSound('assets/delete.mp3', 0.8);
            for (let i = 1; i < 6; i++) {
                setTimeout(() => playSfx(150 + i * 80, 'sawtooth', 0.3, 0.3), i * 60);
            }
            bots = [];
        }
    }
    iCD = now + COOLDOWNS[selectedChar].i * (selectedBot === 'anh' ? 1.5 : 1);
}

function useO() {
    const now = Date.now();
    if (now < oCD || player.isDelayed) return;
    shakeAmount = 40;
    if (selectedChar === 'dang') {
        player.isUlt = true;
        player.isGhost = true;
        player.ultEnd = now + 3000;
        player.ghostEnd = now + 3000;
        playSound('assets/weave.mp3');
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#06b6d4' : '#fff');
            }, i * 120);
        }
    } else if (selectedChar === 'khang') {
        player.isUlt = true;
        player.ultEnd = now + 6000;
        player.khangTraps = 5;
        document.getElementById('trap-counter').classList.remove('hidden');
        document.getElementById('trap-counter').innerText = `BẪY CÒN LẠI: 5`;
        playSound('assets/i-gotta-get-outta-here.mp3', 0.6);
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, 'rgba(255,255,255,0.8)');
            }, i * 150);
        }
    } else if (selectedChar === 'loi') {
        bots.forEach(b => {
            b.x += (b.x - player.x) * 4;
            b.y += (b.y - player.y) * 4;
            b.delayUntil = now + 5000;
        });
        bots.forEach(b => {
            if (checkCollision(b.x, b.y)) {
                let dirs = [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]];
                for (let dist = 0.1; dist < 2; dist += 0.1) {
                    for (let [dx, dy] of dirs) {
                        if (!checkCollision(b.x + dx * dist, b.y + dy * dist)) {
                            b.x += dx * dist;
                            b.y += dy * dist;
                            break;
                        }
                    }
                }
            }
        });
        spawnShockwave(player.x, player.y, '#6366f1');
        playSound('assets/stagger.mp3', 1);
    } else if (selectedChar === 'tan') {
        // HUNTER ULT: become hunter — touching bots destroys them, +0.25x speed per kill, lasts 30s
        player.isTanUlt = true;
        player.tanUltEnd = now + 30000;
        player.tanUltKills = 0;
        player.isInvincible = true;
        player.invincibleEnd = now + 30000;
        shakeAmount = 50;
        playSound('assets/stagger.mp3', 1);
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 3 === 0 ? '#facc15' : (i % 3 === 1 ? '#ef4444' : '#fff'));
            }, i * 100);
        }
    }
    oCD = now + COOLDOWNS[selectedChar].o * (selectedBot === 'anh' ? 1.5 : 1);
}

/**
 * GAME LOOP
 */

function update() {
    if (!gameActive) return;
    const now = Date.now();
    const elapsed = now - startTime;
    const isHard = gameMode === 'hard';
    const isRageable = (selectedBot !== 'anh');
    // BOT STATES
    const rageCycle = 15000 - (selectedBot === 'luom' ? 5000 : 0) - (isHard ? 2500 : 0);
    const rageDuration = 5000;
    const isCommonRage = isRageable && elapsed > 10000 && (elapsed % rageCycle) > (rageCycle - rageDuration);
    // BOT Specialty Logic
    // Queen delays the player for 3 seconds (4.5 seconds on hard mode)
    if (selectedBot === 'quyen' && !player.isDelayed && elapsed > 5000 && (elapsed % (10000 + 1250 * (currentLevel-1))) < 50) {
        player.isDelayed = true;
        player.delayEnd = now + (isHard ? 4500 : 3000);
        document.getElementById('warning-flash').classList.add('delay-warning');
        playSound('assets/delaying.mp3', 0.9);
        playSfx(450, 'square', 0.5);
    }

    if (now > player.delayEnd) {
        player.isDelayed = false;
        document.getElementById('warning-flash').classList.remove('delay-warning');
    }

    // Miss Anh: place a wall on the shortest path every 10s
    if (selectedBot === 'anh' && 
        elapsed > (10000 + (isHard ? 500 : 800) * (currentLevel - 1)) && 
        (elapsed % (10000 + (isHard ? 500 : 800) * (currentLevel - 1))) < 50 && freezeEnd < now) {
        let path = getPath(player.x, player.y, COLS - 1.5, ROWS - 1.5);
        if (path.length > 2) {
            for (let i = path.length - 2; i > 0; i--) {
                let [wx, wy] = path[i];
                if (maze[wy][wx] !== 'k' && maze[wy][wx] !== 'a' && maze[wy][wx] !== 'w' 
                    && Math.sqrt((wx + 0.5 - player.x) ** 2 + (wy + 0.5 - player.y) ** 2) > 1.5 && Math.sqrt((wx + 0.5 - (COLS - 1.5)) ** 2 + (wy + 0.5 - (ROWS - 1.5)) ** 2) > 1.5) {
                    maze[wy][wx] = 'a';
                    setTimeout(() => {
                        maze[wy][wx] = '.';
                    }, (isHard ? 7500 : 6000) + (500 * (currentLevel - 1)));
                    spawnShockwave(wx + 0.5, wy + 0.5, '#ef4444');
                    playSound('assets/placingwall.mp3');
                    break;
                }
            }
        }
    }
    // Lerm movement
    let isLuomCanMove = false;
    let tick = 500 - currentLevel * 45 - (isCommonRage ? 12 * currentLevel : 0) - (isHard ? 6 * currentLevel : 4 * currentLevel);
    if (selectedBot === 'luom' && elapsed > tick) {
        const luomDur = (isHard ? 75 : 50) + (isCommonRage ? (isHard ? 12.5 : 7) * currentLevel : 0);
        if ((elapsed % tick) < luomDur && !isLuomCanMove && freezeEnd < now && bots.length > 0) {
            isLuomCanMove = true;
            playSound('assets/ruler-slap.mp3', 0.12);
        }
    }

    const statusEl = document.getElementById('bot-status');
    if (isCommonRage) {
        statusEl.classList.remove('opacity-0');
        statusEl.innerText = "BOT PHẪN NỘ! (2X SPEED)";
        statusEl.style.color = '';
        if (!isRaging) {
            if (selectedBot !== 'quyen') 
                playSound('assets/rahhh.mp3');
            else
                playSound('assets/waapp-angry.mp3');
            isRaging = true;
        }
        playAlarm();
    } else {
        isRaging = false;
        if (player.isSlowed && now < player.slowEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#c084fc';
            statusEl.innerText = "🐌 BỊ LÀM CHẬM! (0.25X TỐC ĐỘ)";
        } else if (selectedChar === 'tan' && player.isTanGod && now < player.tanGodEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#facc15';
            statusEl.innerText = "⚡ GOD MODE! (5X TỐC ĐỘ + BẤT TỬ)";
        } else if (selectedChar === 'tan' && player.isTanSharingan && now < player.tanSharinganEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#ef4444';
            statusEl.innerText = "👁 SHARINGAN! (BOT BỊ ĐÓNG BĂNG)";
        } else if (selectedChar === 'tan' && player.isTanUlt && now < player.tanUltEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#f97316';
            statusEl.innerText = `🔥 HUNTER MODE! KILLS: ${player.countKills} (+${player.countKills * 25}% SPD)`;
        } else {
            statusEl.style.color = '';
            statusEl.classList.add('opacity-0');
        }
    }

    // SPAWN
    const maxBots = (isHard ? [5, 12, 20][currentLevel - 1] : [3, 6, 9][currentLevel - 1]);
    const spawnInterval = (isHard ? 2500 : 4000) - (selectedBot == 'luom' ? 1250 : 0);
    if (elapsed > 2000 - (selectedBot == 'luom' ? 1250 : 0) && (bots.length < maxBots) && (now - lastBotSpawnTime > spawnInterval)) {
        bots.push({
            x: 1.5, y: 1.5, delayUntil: now + 500 + (selectedBot == 'luom' ? 250 : 0), nextPathUpdate: 0,
            currentPath: [], rageUntil: 0,
            superRageStart: 0, superRageEnd: 0,
            isDead: false
        });
        spawnShockwave(1.5, 1.5, '#ef4444');
        lastBotSpawnTime = now;
    }

    // PLAYER MOVE
    let baseSpd = isHard ? 0.126 : 0.08;
    let mult = 1;
    if (player.isDelayed) mult = 0;
    else if (player.isParrying) mult = 0.015;
    else if (player.isParrySuccess) {
        mult = 1.3;
        player.isParrySuccess = false;
        iCD = Math.max(iCD - COOLDOWNS[selectedChar].i * (selectedBot === 'anh' ? 1.5 : 1) / 2, now);
    }
    else {
        if (player.isCoffee) mult *= 1.5;
        if (player.isMedalSpeed) mult *= 2.0;
        if (player.isUlt) mult *= (selectedChar === 'dang' ? 2.75 : 1.6);
        if (player.isSlowed && now < player.slowEnd) mult *= 0.25;
        if (selectedChar === 'tan' && player.isTanGod && now < player.tanGodEnd) mult *= 2.0;
        if (selectedChar === 'tan' && player.isTanUlt && now < player.tanUltEnd) mult *= (1.0 + player.tanUltKills * 0.25);
    }
    let pSpd = baseSpd * mult;
    if (pSpd > 0) {
        if (keys.w && !checkCollision(player.x, player.y - pSpd)) player.y -= pSpd;
        if (keys.s && !checkCollision(player.x, player.y + pSpd)) player.y += pSpd;
        if (keys.a && !checkCollision(player.x - pSpd, player.y)) player.x -= pSpd;
        if (keys.d && !checkCollision(player.x + pSpd, player.y)) player.x += pSpd;
    }
    // give the player an aura when invincible
    if (player.isInvincible) {
        spawnTrail(player.x, player.y, 'rgba(255,255,255,0.5)');
    }
    if (selectedChar === 'tan' && player.isTanGod && now < player.tanGodEnd) {
        spawnTrail(player.x, player.y, 'rgba(250,204,21,0.7)');
    }
    if (selectedChar === 'tan' && player.isTanUlt && now < player.tanUltEnd) {
        spawnTrail(player.x, player.y, 'rgba(239,68,68,0.8)');
    }
    resolveWallStick();

    // BOT MOVE
    let bSpdBase = (isHard ? 0.09 : 0.065) + (currentLevel * 0.015);
    if (selectedBot === 'tin') bSpdBase *= (isHard ? 2.0 : 1.75);
    if (selectedBot === 'luom') bSpdBase = (isLuomCanMove ? (isHard ? 1.25 : 1.1) : 0);
    if ((selectedBot === 'quyen' || selectedBot === 'anh') && isHard) bSpdBase *= 1.5;

    bots.forEach(b => {
        if (b.x <= 0 || b.x > COLS - 1 || b.y <= 0 || b.y > ROWS - 1) {
            bots.splice(bots.indexOf(b), 1);
            // reduce player cooldowns
            yCD = Math.max(yCD - COOLDOWNS[selectedChar].y * (selectedBot === 'anh' ? 1.5 : 1) / 2, now);
            uCD = Math.max(uCD - COOLDOWNS[selectedChar].u * (selectedBot === 'anh' ? 1.5 : 1) / 2, now);
            iCD = Math.max(iCD - COOLDOWNS[selectedChar].i * (selectedBot === 'anh' ? 1.5 : 1) / 2, now);
            oCD = Math.max(oCD - COOLDOWNS[selectedChar].o * (selectedBot === 'anh' ? 1.5 : 1) / 2, now);
            return;
        }
        const superEnraged = (now > b.superRageStart && now < b.superRageEnd) && isRageable;
        let finalBSpd = bSpdBase;
        if (superEnraged) finalBSpd *= (selectedBot === 'luom' ? 3.45 : 3.0);
        else if (isCommonRage) finalBSpd *= 2.0;
        if (isLuomCanMove){
            spawnTrail(b.x, b.y, '#ef4444');
        };
        traps.forEach((t, idx) => {
            if (Math.sqrt((b.x - t.x) ** 2 + (b.y - t.y) ** 2) < 0.6) {
                b.delayUntil = now + (isHard ? 2500 : 3500);
                spawnShockwave(t.x, t.y, '#fff');
                playSound('assets/ahhhhhhhhhh.mp3', 0.5);
                traps.splice(idx, 1);
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
            if (selectedChar === 'tan' && player.isTanUlt && now < player.tanUltEnd) {
                // Hunter mode: destroy bot, gain speed
                player.countKills++;
                spawnShockwave(b.x, b.y, '#facc15');
                spawnShockwave(b.x, b.y, '#ef4444');
                shakeAmount = 15;
                playSound('assets/kill.mp3');
                b.isDead = true;
            } else if (player.isShield && now < player.shieldEnd) {
                player.isShield = false;
                b.delayUntil = now + (isHard ? 2500 : 3500);
                spawnShockwave(player.x, player.y, '#fbbf24');
            } else if (player.isParrying && now < player.parryEnd) {
                freezeEnd = now + 2500;
                player.isInvincible = true;
                player.isParrying = false;
                player.invincibleEnd = now + 3000;
                player.isParrySuccess = true;
                b.delayUntil = now + 4500;
                // explosion effect + sfx
                playSfx(200, 'sine', 0.2);
                spawnShockwave(player.x, player.y, '#ff0000');
                spawnShockwave(player.x, player.y, '#ffa653');
                spawnShockwave(player.x, player.y, '#ffffff');
                // rage after stunned
                if (selectedBot !== 'anh') {
                    b.superEnraged = true;
                    b.superRageStart = now + 3500;
                    b.superRageEnd = now + 7000;
                    if (selectedBot === 'tin') 
                        playSound('assets/rahhh.mp3');
                    else if (selectedBot === 'luom')
                        playSound('assets/gotta-sweep.mp3');
                    else
                        playSound('assets/waapp-angry.mp3');
                }
                // show parry picture + ease-out + sfx in assets
                const parry = document.getElementById('parry');
                parry.classList.remove('hidden');
                parry.style.opacity = 1;
                setTimeout(() => {
                    parry.style.transition = 'opacity 0.7s ease-out';
                    parry.style.opacity = 0;
                }, 300);
                setTimeout(() => {
                    parry.classList.add('hidden');
                    parry.style.transition = 'none';
                }, 600);
                // play custom parry sfx in assets
                playSound('assets/parry.mp3');
            } else if (!player.isGhost && freezeEnd < now && (!player.isInvincible || now > player.invincibleEnd)) {
                endGame(false, selectedBot);
                playSound('assets/kill.mp3');
            }
        }
    });
    bots = bots.filter(b => !b.isDead);
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
        } else {
            endGame(true, selectedBot);
            setTimeout(() => {
                playSound('assets/winning.mp3');
            }, 100);
        }
    }

    // CLEANUP
    shockwaves.forEach(s => { s.r += 10; s.life -= 0.025; });
    shockwaves = shockwaves.filter(s => s.life > 0);
    trails.forEach(t => t.life -= 0.06);
    trails = trails.filter(t => t.life > 0);
    traps = traps.filter(t => now < t.life);
    if (shakeAmount > 0) shakeAmount *= 0.92;

    if (now > freezeEnd) freezeEnd = 0;
    if (now > player.parryEnd) player.isParrying = false;
    if (now > player.ghostEnd) player.isGhost = false;
    if (now > player.coffeeEnd) player.isCoffee = false;
    if (now > player.shieldEnd) player.isShield = false;
    if (now > player.invincibleEnd) player.isInvincible = false;
    if (now > player.medalSpeedEnd) player.isMedalSpeed = false;
    if (now > player.ultEnd) {
        if (player.isUlt && selectedChar === 'khang') 
            document.getElementById('trap-counter').classList.add('hidden');
        player.isUlt = false;
    }
    if (now > player.roadEnd) showRoad = false;
    if (now > player.tanGodEnd) player.isTanGod = false;
    if (now > player.tanSharinganEnd) player.isTanSharingan = false;
    if (now > player.tanUltEnd) player.isTanUlt = false;

    if (player.isUlt) {
        let color = selectedChar === 'dang' ? '#06b6d4' : (selectedChar === 'khang' ? '#fff' : '#6366f1');
        spawnTrail(player.x, player.y, color);
    }
    decoys = decoys.filter(d => now < d.lifeEnd);

    updateUI(now);
    draw(isCommonRage & isRageable);
    requestAnimationFrame(update);
}

/**
 * RENDER
 */
function drawEntity(x, y, color, eyeColor, isBot = false, isEnraged = false) {
    const size = (isBot ? 0.75 : 0.6) * TILE_SIZE;
    if (!isBot && player.isShield && Date.now() < player.shieldEnd) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fbbf24';
        ctx.strokeRect(x * TILE_SIZE - size * 0.8, y * TILE_SIZE - size * 0.8, size * 1.6, size * 1.6);
        ctx.shadowBlur = 0;
    }
    if (isBot && isEnraged) {
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
    ctx.fillStyle = (isBot && isEnraged) ? '#fff' : eyeColor;
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
                grad.addColorStop(0, inRage ? '#450a0a' : '#222c3c');
                grad.addColorStop(1, '#020617');
                ctx.fillStyle = grad;
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (maze[r][c] === 'a') {
                let grad = ctx.createLinearGradient(c * TILE_SIZE, r * TILE_SIZE, (c + 1) * TILE_SIZE, (r + 1) * TILE_SIZE);
                grad.addColorStop(0, '#ffae00');
                grad.addColorStop(1, '#b6ae25');
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
        ctx.fillStyle = (t.isGlowing ? '#ffffff' : '#505050');
        ctx.shadowBlur = 10;
        ctx.shadowColor = (t.isGlowing ? '#ffffff' : '#505050')
        ctx.fillRect(t.x * TILE_SIZE - 6, t.y * TILE_SIZE - 6, 12, 12);
        ctx.shadowBlur = 0;
    });

    decoys.forEach(d => drawEntity(
        d.x, d.y, 'rgba(255,255,255,0.3)', '#000'
    ));

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

    let pCol = selectedChar === 'khang' ? '#22c55e' : (selectedChar === 'dang' ? '#06b6d4' : (selectedChar === 'loi' ? '#6366f1' : '#f97316'));
    if (player.isUlt && selectedChar === 'dang') pCol = '#fbbf24';
    if (player.isDelayed) pCol = '#475569';
    if (player.isParrying) pCol = '#7ec8d5';
    if (player.isGhost && selectedChar === 'dang') pCol = 'rgba(6, 182, 212, 0.5)';
    if (selectedChar === 'tan' && player.isTanGod && Date.now() < player.tanGodEnd) pCol = '#facc15';
    if (selectedChar === 'tan' && player.isTanUlt && Date.now() < player.tanUltEnd) pCol = '#ef4444';
    if (selectedChar === 'tan' && player.isTanSharingan && Date.now() < player.tanSharinganEnd) {
        // Sharingan: tint the whole canvas red
        ctx.save();
        ctx.fillStyle = 'rgba(180, 0, 0, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    drawEntity(player.x, player.y, pCol, (player.isGhost || player.isDelayed) ? 'transparent' : '#454545');

    bots.forEach(b => {
        const now = Date.now();
        const superEnraged = (now > b.superRageStart && now < b.superRageEnd) || (selectedBot === 'luom' && ((now - startTime) % 20000 < (gameMode === 'hard' ? 5000 : 3000)) && (now - startTime > 20000));
        let bCol = (selectedBot === 'anh' ? '#f59e0b' : (selectedBot === 'quyen' ? '#ec4899' : (selectedBot === 'tin' ? '#3b82f6' : '#ef4444')));
        if (now < freezeEnd || now < b.delayUntil) bCol = '#fff';
        drawEntity(b.x, b.y, bCol, '#000', true, inRage, superEnraged);
    });

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
    } else {
        // replace the link based on the bot, change link color and make the link hyperlink
        document.getElementById('end-title').innerText = "BỊ BẮT RỒI!";
        document.getElementById('end-title').style.color = "red";
        if (selectedBot === 'anh') {
            document.getElementById('end-subtitle').innerText = "Từ đây đến hết kỳ nghỉ hè, bạn phải đi học thêm tại nhà cô!";
        } else {
            document.getElementById('end-subtitle').innerText = "Từ đây đến hết kỳ nghỉ hè của bạn, phải giải tất cả bài tập tại ";
            const linkElement = document.createElement('a');
            linkElement.href = links[bot];
            linkElement.target = "_blank";
            linkElement.style.color = "#3b82f6";
            linkElement.innerText = links[bot];
            document.getElementById('end-subtitle').appendChild(linkElement);
        }
    }
}

function resetGameState() {
    bots = [];
    particles = [];
    decoys = [];
    trails = [];
    shockwaves = [];
    traps = [];
    gameActive = false;
    gamePaused = false;
    pauseStart = 0;
    startTime = 0;
    yCD = uCD = iCD = oCD = 0;
    freezeEnd = 0;
    lastBotSpawnTime = 0;
    shakeAmount = 0;
    showRoad = false;
    alarmSoundPlaying = false;
    player = {
        x: 1.5, y: 1.5,
        isCoffee: false, isGhost: false, isShield: false, isUlt: false,
        ultEnd: 0, roadEnd: 0, shieldEnd: 0, ghostEnd: 0, coffeeEnd: 0,
        khangDashCount: 0, khangTraps: 5,
        isMedalSpeed: false, medalSpeedEnd: 0,
        isDelayed: false, delayEnd: 0,
        isParrying: false, parryEnd: 0,
        isInvincible: false, invincibleEnd: 0,
        isParrySuccess: false,
        isSlowed: false, slowEnd: 0,
        isTanGod: false, tanGodEnd: 0,
        isTanSharingan: false, tanSharinganEnd: 0,
        isTanUlt: false, tanUltEnd: 0,
        countKills: 0
    };
    document.getElementById('warning-flash').classList.remove('delay-warning');
    document.getElementById('warning-flash').classList.remove('slow-warning');
    document.getElementById('warning-flash').classList.remove('sharingan-warning', 'god-mode-warning', 'hunter-warning');
}

function returnToSelection() {
    resetGameState();
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('selection-screen').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    setPauseOverlay(false);
}

function returnToGame() {
    resetGameState();
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('selection-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    currentLevel = 1;
    generateMaze();
    gameActive = true;
    startTime = Date.now();
    update();
    playSfx(300, 'sine', 0.5, 0.1, 600);
}

window.selectChar = (c) => {
    selectedChar = c;
    const colors = { khang: '#22c55e', dang: '#06b6d4', loi: '#6366f1', tan: '#f97316' };
    ['khang', 'dang', 'loi', 'tan'].forEach(id => {
        const el = document.getElementById('char-' + id);
        if (!el) return;
        el.style.borderColor = (id === c ? colors[id] : '#1e293b');
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
    ['quyen', 'anh', 'tin', 'luom'].forEach(id => document.getElementById('bot-' + id).classList.toggle('selected-box', id === b));
    const n = { quyen: 'MISS QUEEN', anh: 'MISS ANH', tin: 'MR TING', luom: 'MR LERM' };
    document.getElementById('ui-bot-badge').innerText = `ĐỐI THỦ: ${n[b]}`;
};

document.getElementById('start-btn').onclick = () => {
    resetGameState();
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
document.getElementById('vers').innerText = 'V' + version;
selectChar('khang');
selectMode('normal');
selectBot('quyen');
