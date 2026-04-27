/**
 * ENGINE & CONFIG
 */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const version = "1.2 (preview, build 7)";
const debugmode = true;

// GAME CONFIG - Tùy chỉnh tốc độ game (sẽ được load từ settings)
// Xem thêm trong phần SETTINGS SYSTEM ở cuối file

let ROWS, COLS, TILE_SIZE;
let maze = [];

let player = {
    x: 1.5, y: 1.5,
    isMoving: false, isCoffee: false, isGhost: false, isShield: false, isUlt: false,
    ultEnd: 0, roadEnd: 0, shieldEnd: 0, ghostEnd: 0, coffeeEnd: 0,
    khangDashCount: 0, khangTraps: 5,
    isMedalSpeed: false, medalSpeedEnd: 0,
    isDelayed: false, delayEnd: 0,
    isParrying: false, parryEnd: 0,
    isInvincible: false, invincibleEnd: 0,
    isParrySuccess: false,
    isSuperSlow: false, superSlowEnd: 0,
    isSlow: false, slowEnd: 0,
    isFast: false, fastEnd: 0,
    // Tan skills
    isTanGod: false, tanGodEnd: 0,
    isTanSharingan: false, tanSharinganEnd: 0,
    isTanHunter: false, tanHunterEnd: 0,
    countKills: 0,
    // Thoai skills
    isThoaiSlow: false, thoaisuperSlowEnd: 0,       // [Y] bots slowed
    isThoaiBoosted: false, thoaiBoostedEnd: 0,  // [U] Thoai speed boost after rage bait
    isThoaiHunter: false, thoaiHunterEnd: 0,    // [I] lucky hunter
    isThoaiPenalty: false, thoaiPenaltyEnd: 0,   // [I] unlucky slow
    // Quang skills
    isQuangJumping: false, quangJumpEnd: 0, // [O] earthquake jump
    isQuangGravity: false, quangGravityEnd: 0,   // [U] gravity field
    // Trung Béo skills
    isTrungWindGod: false, trungWindGodEnd: 0,   // [Y] 2.5x speed + ghost 5s
    isTrungTired: false, trungTiredEnd: 0,         // [Y] after wind god: 0.5x speed 2s
    isTrungHasagi: false, trungHasagiEnd: 0,       // [U] shockwave push everyone through maze
    isTrungDashing: false, trungDashEnd: 0,        // [I] atomic slice dash
    isTrungRasengan: false, trungRasenganEnd: 0,   // [O] wind ball follows player
    trungRasenganX: 0, trungRasenganY: 0
};

let bots = [], particles = [], decoys = [], trails = [], shockwaves = [], traps = [], blackholes = [];
let gameActive = false, gamePaused = false, pauseStart = 0, startTime = 0, currentLevel = 1;
let selectedBot = 'quyen', selectedChar = 'khang', gameMode = 'normal';
let yCD = 0, uCD = 0, iCD = 0, oCD = 0, freezeEnd = 0, lastBotSpawnTime = 0;
let shakeAmount = 0, showRoad = false;
let alarmSoundPlaying = false;
let isRaging = false;

// Global variables for settings (can be modified by settings system)
var TARGET_FPS = 60;
var TARGET_FRAME_TIME = 1000 / TARGET_FPS;
var ENABLE_SHADOW_EFFECTS = false;
var MAX_SHOCKWAVES = 25;
var MAX_TRAILS = 20;
var MAX_PARTICLES = 50;

var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;
var lastUpdateTime = 0, deltaTime = 0;
let mazeCache = null, mazeCacheRage = null; // Cache for rendered maze

const COOLDOWNS = {
    khang: { y: 4000, u: 12000, i: 3000, o: 18000 },
    dang: { y: 8000, u: 10000, i: 12000, o: 18000 },
    loi: { y: 6000, u: 12000, i: 6000, o: 18000 },
    tan:  { y: 7000, u: 7000, i: 8000, o: 25000 }, // dev character
    thoai: { y: 6000, u: 7000, i: 11000, o: 25000 },
    quang: { y: 12000, u: 20000, i: 12000, o: 25000 },
    trung: { y: 15000, u: 14000, i: 8000, o: 18000 }
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
    player.fastEnd += delta;
    player.slowEnd += delta;
    player.superSlowEnd += delta;
    player.delayEnd += delta;
    player.parryEnd += delta;
    player.invincibleEnd += delta;
    player.superSlowEnd += delta;
    player.tanGodEnd += delta;
    player.tanSharinganEnd += delta;
    player.tanHunterEnd += delta;
    player.thoaisuperSlowEnd += delta;
    player.thoaiBoostedEnd += delta;
    player.thoaiHunterEnd += delta;
    player.thoaiPenaltyEnd += delta;
    player.trungWindGodEnd += delta;
    player.trungTiredEnd += delta;
    player.trungHasagiEnd += delta;
    player.trungDashEnd += delta;
    player.trungRasenganEnd += delta;
    traps.forEach(t => t.life += delta);
    blackholes.forEach(b => b.lifeEnd += delta);
    decoys.forEach(d => d.lifeEnd += delta);
    bots.forEach(b => {
        b.nextPathUpdate += delta;
        b.delayUntil += delta;
        b.superRageStart += delta;
        b.superRageEnd += delta;
        b.rageUntil += delta;
        b.slowEnd += delta;
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
    const baseSize = gameMode === 'normal' ? [15, 25] : [17, 29];
    ROWS = baseSize[0] + [0, 4, 8, 12, 16][currentLevel-1];
    COLS = baseSize[1] + [0, 6, 12, 18, 24][currentLevel-1];

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
    
    // Create maze cache for performance (both normal and rage versions)
    createMazeCache();
    createMazeCacheRage();
}

function createMazeCache() {
    // Create an offscreen canvas to cache the maze
    mazeCache = document.createElement('canvas');
    mazeCache.width = canvas.width;
    mazeCache.height = canvas.height;
    const cacheCtx = mazeCache.getContext('2d');
    
    // Draw all static maze elements to cache
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (maze[r][c] === '#') {
                let grad = cacheCtx.createLinearGradient(c * TILE_SIZE, r * TILE_SIZE, (c + 1) * TILE_SIZE, (r + 1) * TILE_SIZE);
                grad.addColorStop(0, '#222c3c');
                grad.addColorStop(1, '#020617');
                cacheCtx.fillStyle = grad;
                cacheCtx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (maze[r][c] === 'a') {
                let grad = cacheCtx.createLinearGradient(c * TILE_SIZE, r * TILE_SIZE, (c + 1) * TILE_SIZE, (r + 1) * TILE_SIZE);
                grad.addColorStop(0, '#ffae00');
                grad.addColorStop(1, '#b6ae25');
                cacheCtx.fillStyle = grad;
                cacheCtx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (maze[r][c] === 'K') {
                cacheCtx.fillStyle = '#eab308';
                cacheCtx.shadowBlur = 20;
                cacheCtx.shadowColor = '#eab308';
                cacheCtx.beginPath();
                cacheCtx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
                cacheCtx.fill();
                cacheCtx.shadowBlur = 0;
            }
        }
    }
}

function createMazeCacheRage() {
    // Create rage version of maze cache
    mazeCacheRage = document.createElement('canvas');
    mazeCacheRage.width = canvas.width;
    mazeCacheRage.height = canvas.height;
    const cacheCtx = mazeCacheRage.getContext('2d');
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) { 
            if (maze[r][c] === '#') {
                let grad = cacheCtx.createLinearGradient(c * TILE_SIZE, r * TILE_SIZE, (c + 1) * TILE_SIZE, (r + 1) * TILE_SIZE);
                grad.addColorStop(0, '#450a0a');
                grad.addColorStop(1, '#020617');
                cacheCtx.fillStyle = grad;
                cacheCtx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (maze[r][c] === 'a') {
                let grad = cacheCtx.createLinearGradient(c * TILE_SIZE, r * TILE_SIZE, (c + 1) * TILE_SIZE, (r + 1) * TILE_SIZE);
                grad.addColorStop(0, '#ffae00');
                grad.addColorStop(1, '#b6ae25');
                cacheCtx.fillStyle = grad;
                cacheCtx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (maze[r][c] === 'K') {
                cacheCtx.fillStyle = '#eab308';
                cacheCtx.shadowBlur = 20;
                cacheCtx.shadowColor = '#eab308';
                cacheCtx.beginPath();
                cacheCtx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
                cacheCtx.fill();
                cacheCtx.shadowBlur = 0;
            }
        }
    }
}

/**
 * PHYSICS
 */
function checkCollision(x, y, ignoreWalls = false) {
    const h = 0.25;
    const l = Math.floor(x - h), r = Math.floor(x + h), t = Math.floor(y - h), b = Math.floor(y + h);
    for (let i = t; i <= b; i++) {
        for (let j = l; j <= r; j++) {
            if (i <= 0 || i >= ROWS - 1 || j <= 0 || j >= COLS - 1) return true;
            if (player.isQuangJumping && Date.now() < player.quangJumpEnd) return false;
            if (!ignoreWalls && (maze[i][j] === '#' || maze[i][j] === 'a')) return true;
        }
    }
    return false;
}

function resolveWallStick() {
    if (checkCollision(player.x, player.y)) {
        const dirs = [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]];
        for (let dist = 0.1; dist < 1.8; dist += 0.1) {
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
    // Limit shockwave creation to prevent performance issues
    if (shockwaves.length < MAX_SHOCKWAVES) {
        shockwaves.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, r: 0, life: 1.0, color: color });
    }
}

function spawnTrail(x, y, color) {
    // Limit trail creation to prevent performance issues
    if (trails.length < MAX_TRAILS) {
        trails.push({ x, y, life: 1.0, color });
    }
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
    if (now < yCD || player.isDelayed || player.isTrungTired) return;
    if (selectedChar === 'khang') {
        const isUlt = player.isUlt;
        let dx = keys.a ? -1 : (keys.d ? 1 : 0), dy = keys.w ? -1 : (keys.s ? 1 : 0);
        if (!dx && !dy) dy = -1;
        for (let i = 0; i < 10; i++) {
            let nx = player.x + dx * 0.4, ny = player.y + dy * 0.4;
            if (!checkCollision(nx, ny)) {
                spawnTrail(player.x, player.y, isUlt ? 'rgba(255,255,255,0.6)' : 'rgba(34,197,94,0.3)');
                player.x = nx;
                player.y = ny;
            } else break;
        }
        if (isUlt) {
            player.khangDashCount++;
            if (player.khangDashCount < 2) yCD = now + 400;
            else { player.khangDashCount = 0; yCD = now + 1500 * (selectedBot === 'anh' ? 1.5 : 1); }
        } else yCD = now + COOLDOWNS.khang.y * (selectedBot === 'anh' ? 1.5 : 1);
        playSound(`assets/dash${Math.random() < 0.5 ? 1 : 2}.mp3`);
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
        playSound('assets/sasuke.mp3', 0.9);
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#facc15' : '#fff');
            }, i * 80);
        }
        yCD = now + COOLDOWNS.tan.y * (selectedBot === 'anh' ? 1.5 : 1);
    } else if (selectedChar === 'thoai') {
        // MÌ TÔM BÒ KHÔ RADIO: slow all bots to 0.25x for 3s
        player.isThoaiSlow = true;
        player.thoaisuperSlowEnd = now + 3000;
        bots.forEach(b => { b.thoaiSlowUntil = now + 3000; });
        shakeAmount = 10;
        spawnShockwave(player.x, player.y, '#a78bfa');
        for (let i = 0; i < 6; i++) {
            setTimeout(() => spawnShockwave(player.x, player.y, '#7c3aed'), i * 80);
        }
        const mitombokho = document.getElementById('mitombokho-flash');
        mitombokho.classList.remove('hidden');
        mitombokho.style.opacity = 1;
        setTimeout(() => {
            mitombokho.style.transition = 'opacity 0.7s ease-out';
            mitombokho.style.opacity = 0;
        }, 300);
        setTimeout(() => {
            mitombokho.classList.add('hidden');
            mitombokho.style.transition = 'none';
        }, 600);
        playSound('assets/mitombokhoradio.mp3', 0.67);
        yCD = now + COOLDOWNS.thoai.y * (selectedBot === 'anh' ? 1.5 : 1);
    } else if (selectedChar === 'quang') {
        // EARTHQUAKE: shake camera, delay bots 3s, then 0.25x speed for 2s
        shakeAmount = 35;
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                shakeAmount = Math.max(shakeAmount, 20);
                spawnShockwave(player.x, player.y, i % 2 ? '#a16207' : '#78350f');
            }, i * 150);
        }
        playSound('assets/stomp.mp3', 0.7);
        bots.forEach(b => {
            b.delayUntil = now + 4500;
            b.quangEarthquakeSlowUntil = now + 4500;
        });
        yCD = now + COOLDOWNS.quang.y * (selectedBot === 'anh' ? 1.5 : 1);
    } else if (selectedChar === 'trung') {
        // CON CỦA THẦN GIÓ: 2x speed + ghost through bots 5s, then tired 0.5x for 2s
        player.isTrungWindGod = true;
        player.trungWindGodEnd = now + 5000;
        player.isGhost = true;
        player.ghostEnd = now + 5000;
        shakeAmount = 25;
        for (let i = 0; i < 12; i++) {
            setTimeout(() => spawnShockwave(player.x, player.y, i % 2 ? '#38bdf8' : '#e0f2fe'), i * 80);
        }
        playSound('assets/the-child-of-the-wind-god.mp3', 0.45);
        setTimeout(() => {
            player.isTrungWindGod = false;
            player.isGhost = false;
            player.isTrungTired = true;
            player.trungTiredEnd = now + 7000; // 5s wind + 2s tired
            spawnShockwave(player.x, player.y, '#94a3b8');
            playSfx(200, 'sine', 0.3, 0.2, 100);
        }, 5000);
        yCD = now + COOLDOWNS.trung.y * (selectedBot === 'anh' ? 1.5 : 1);
    }
}

function useU() {
    const now = Date.now();
    if (now < uCD || player.isDelayed || player.isTrungTired) return;
    shakeAmount = 10;
    if (selectedChar === 'khang') {
        freezeEnd = now + 4000;
        spawnShockwave(player.x, player.y, 'rgba(255,255,255,0.5)');
        playSound('assets/timestop.mp3', 1.0);
        document.body.classList.add('time-stop');
        // play the time-stop effect in reverse
        setTimeout(() => {
            document.body.classList.remove('time-stop');
            spawnShockwave(player.x, player.y, 'rgba(255,255,255,0.5)');
        }, 4000);

    } else if (selectedChar === 'dang') {
        let isPunchSuccess = false;
        bots.forEach(b => {
            let dx = b.x - player.x, dy = b.y - player.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 5) {
                b.x += (dx / d) * 4;
                b.y += (dy / d) * 4;
                b.delayUntil = now + 2000;
                isPunchSuccess = true;
            }
        });
        bots = bots.filter(b => !b.isDead);
        bots.forEach(b => {
            if (checkCollision(b.x, b.y)) {
                let dirs = [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]];
                for (let dist = 0.1; dist < 4; dist += 0.1) {
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
            spawnShockwave(player.x, player.y, 'rgba(255, 255, 255, 0.8)');
            playSound('assets/punchsucess.mp3', 0.5);
        } else playSound('assets/missing.mp3', 0.8)

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
    } else if (selectedChar === 'thoai') {
        // RAGE BAIT: force all bots into 2x rage for 2s, then Thoai gets 2x speed for 3s
        bots.forEach(b => {
            b.superRageStart = now;
            b.superRageEnd = now + 2000;
        });
        shakeAmount = 20;
        spawnShockwave(player.x, player.y, '#f43f5e');
        playSound('assets/yeah_come_get_some_ya_freakin_wuss.mp3', 1.0)
        // After 2s, Thoai gets 2x speed for 3s
        setTimeout(() => {
            player.isThoaiBoosted = true;
            player.thoaiBoostedEnd = now + 5000;
            spawnShockwave(player.x, player.y, '#22c55e');
            playSound('assets/afterragebait.mp3', 0.65);
        }, 2000);
    } else if (selectedChar === 'quang') {
        // GRAVITY FIELD: player slowed 0.5x for 2s, bots frozen 5s (gravitational pull effect)
        player.isSuperSlow = true;
        player.superSlowEnd = now + 2000;
        player.isQuangGravity = true;
        player.quangGravityEnd = now + 5000;
        bots.forEach(b => {
            b.delayUntil = now + 3000;
            b.quangGravityUntil = now + 3000;
        });
        // Spawn pulsing purple shockwaves
        for (let i = 0; i < 14; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#7e22ce' : '#c084fc');
                if (i < 6) shakeAmount = Math.max(shakeAmount, 15);
            }, i * 200);
        }
        playSfx(80, 'sine', 0.5, 0.35, 40);
    } else if (selectedChar === 'trung') {
        // HASAGI: wild shockwave push everyone through the maze
        shakeAmount = 35;
        playSound('assets/hasagi.mp3', 0.7);
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#60a5fa' : '#bfdbfe');
                shakeAmount = Math.max(shakeAmount, 20);
            }, i * 60);
        }
        // Push ALL bots away from player ignoring walls
        bots.forEach(b => {
            const dx = b.x - player.x, dy = b.y - player.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const pushDist = 8;
            b.x = Math.max(1, Math.min(COLS - 2, b.x + (dx / d) * pushDist));
            b.y = Math.max(1, Math.min(ROWS - 2, b.y + (dy / d) * pushDist));
            b.delayUntil = now + 2000;
        });
        // Resolve bots that landed in walls
        bots.forEach(b => {
            if (checkCollision(b.x, b.y)) {
                const dirs = [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]];
                for (let dist = 0.1; dist < 5; dist += 0.1) {
                    for (let [ddx, ddy] of dirs) {
                        if (!checkCollision(b.x + ddx * dist, b.y + ddy * dist)) {
                            b.x += ddx * dist; b.y += ddy * dist; break;
                        }
                    }
                    if (!checkCollision(b.x, b.y)) break;
                }
            }
        });
    }
    uCD = now + COOLDOWNS[selectedChar].u * (selectedBot === 'anh' ? 1.5 : 1);
}

function useI() {
    const now = Date.now();
    if (now < iCD || player.isDelayed || player.isTrungTired) return;
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
        player.parryEnd = now + 1250;
        player.invincibleEnd = now + 1250;
        player.isParrying = true;
        player.isInvincible = true;
        playSound('assets/epic-twinkle.mp3', 0.8);
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
    } else if (selectedChar === 'thoai') {
        // NGẮN THỌT: 70% hunter 3s, 30% penalty 0.5x speed 3s
        const lucky = Math.random() < 0.65;
        if (lucky) {
            player.isThoaiHunter = true;
            player.thoaiHunterEnd = now + 3000;
            player.isInvincible = true;
            player.invincibleEnd = now + 3000;
            shakeAmount = 30;
            for (let i = 0; i < 8; i++) {
                setTimeout(() => spawnShockwave(player.x, player.y, i % 2 ? '#facc15' : '#ef4444'), i * 80);
            }
        } else {
            player.isThoaiPenalty = true;
            player.thoaiPenaltyEnd = now + 3000;
            shakeAmount = 15;
            spawnShockwave(player.x, player.y, '#94a3b8');
        }
        const nganthot = document.getElementById('nganthot-flash');
        nganthot.classList.remove('hidden');
        nganthot.style.opacity = 1;
        setTimeout(() => {
            nganthot.style.transition = 'opacity 0.7s ease-out';
            nganthot.style.opacity = 0;
        }, 300);
        setTimeout(() => {
            nganthot.classList.add('hidden');
            nganthot.style.transition = 'none';
        }, 600);
        playSound('assets/motcaichettruyenthong.mp3', 0.67);
    } else if (selectedChar === 'quang') {
        playSound('assets/burps.mp3', 0.7);
        player.isSlow = true;
        player.slowEnd = now + 1000;
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#33d87d' : '#20e820');
                shakeAmount = 50;
            }, i * 60);
        }
        bots.forEach(b => {
            const dx = b.x - player.x, dy = b.y - player.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const pushDist = 5;
            b.x = Math.max(1, Math.min(COLS - 2, b.x + (dx / d) * pushDist));
            b.y = Math.max(1, Math.min(ROWS - 2, b.y + (dy / d) * pushDist));
            b.isSlow = true;
            b.slowEnd = now + 3500;
            b.delayUntil = now + 1000;
        });
        bots.forEach(b => {
            if (checkCollision(b.x, b.y)) {
                const dirs = [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]];
                for (let dist = 0.1; dist < 5; dist += 0.1) {
                    for (let [ddx, ddy] of dirs) {
                        if (!checkCollision(b.x + ddx * dist, b.y + ddy * dist)) {
                            b.x += ddx * dist; b.y += ddy * dist; 
                            break;
                        }
                    }
                    if (!checkCollision(b.x, b.y)) break;
                }
            }
        });
    } else if (selectedChar === 'trung') {
        // ATOMIC SLICE: dash like Khang Y, kill all bots surfed past (split effect)
        let dx = keys.a ? -1 : (keys.d ? 1 : 0), dy = keys.w ? -1 : (keys.s ? 1 : 0);
        if (!dx && !dy) dy = -1;
        playSound('assets/katana-schwing.mp3', 0.45);
        const dashPositions = [];
        for (let i = 0; i < 16; i++) {
            let nx = player.x + dx * 0.4, ny = player.y + dy * 0.4;
            if (!checkCollision(nx, ny)) {
                spawnTrail(player.x, player.y, 'rgba(186,230,253,0.7)');
                player.x = nx; player.y = ny;
                dashPositions.push({ x: player.x, y: player.y });
            } else break;
        }
        shakeAmount = 15;
        // Kill bots along the dash path
        bots.forEach(b => {
            const wasHit = dashPositions.some(p => Math.sqrt((b.x - p.x) ** 2 + (b.y - p.y) ** 2) < 0.7);
            if (wasHit) {
                // Spawn split effect (two shockwaves flying apart)
                for (let s = 0; s < 5; s++) {
                    setTimeout(() => {
                        spawnShockwave(b.x + s * dx * 0.3, b.y + s * dy * 0.3, '#bfdbfe');
                        spawnShockwave(b.x - s * dx * 0.3, b.y - s * dy * 0.3, '#7dd3fc');
                    }, s * 40);
                }
                playSound('assets/kill.mp3', 0.8);
                b.isDead = true;
            }
        });
        bots = bots.filter(b => !b.isDead);
    }
    iCD = now + COOLDOWNS[selectedChar].i * (selectedBot === 'anh' ? 1.5 : 1);
}

function useO() {
    const now = Date.now();
    if (now < oCD || player.isDelayed || player.isTrungTired) return;
    shakeAmount = 40;
    if (selectedChar === 'dang') {
        player.isUlt = true;
        player.isGhost = true;
        player.ultEnd = now + 4500;
        player.ghostEnd = now + 4500;
        playSound('assets/weave.mp3');
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#06b6d4' : '#fff');
            }, i * 120);
        }
    } else if (selectedChar === 'khang') {
        player.isUlt = true;
        player.ultEnd = now + 5000;
        playSound('assets/lets-go.mp3', 1);
        iCD = now;
        player.khangTraps = 5;
        document.getElementById('trap-counter').classList.remove('hidden');
        document.getElementById('trap-counter').innerText = `BẪY CÒN LẠI: 5`;
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
                let dirs = [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]];
                for (let dist = 0.1; dist < 4; dist += 0.1) {
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
        player.isTanHunter = true;
        player.tanHunterEnd = now + 30000;
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
    } else if (selectedChar === 'thoai') {
        // BLACK HOLE: spawn at player pos, pulls bots, destroys on contact, lives 3s
        blackholes.push({
            x: player.x,
            y: player.y,
            lifeEnd: now + 5000,
            radius: 0,
            exploded: false
        });
        shakeAmount = 40;
        for (let i = 0; i < 18; i++) {
            setTimeout(() => spawnShockwave(player.x, player.y, i % 3 === 0 ? '#000' : (i % 3 === 1 ? '#4c1d95' : '#7c3aed')), i * 60);
        }
        playSound('assets/black-hole.mp3', 0.67);
    } else if (selectedChar === 'quang') {
        // EARTHQUAKE JUMP: jump and destroy 3x3 blocks when landing
        player.isQuangJumping = true;
        player.quangJumpEnd = now + 1500;
        player.isInvincible = true;
        player.invincibleEnd = now + 1700;
        playSound('assets/wee.mp3', 0.4);
        setTimeout(() => {
            player.isSlow = true;
            player.slowEnd = now + 1200;
        }, 150);
    } else if (selectedChar === 'trung') {
        // RASENGAN: spawn wind ball that follows player for 5s
        // if a bot touches it: that bot 0.25x for 30s, all others pushed + 0.5x for 3s
        player.isTrungRasengan = true;
        player.trungRasenganEnd = now + 5000;
        player.trungRasenganX = player.x;
        player.trungRasenganY = player.y;
        shakeAmount = 20;
        playSound('assets/rasengan-sound-effect.mp3', 0.67);
        for (let i = 0; i < 10; i++) {
            setTimeout(() => spawnShockwave(player.x, player.y, i % 2 ? '#38bdf8' : '#7dd3fc'), i * 80);
        }
    }
    oCD = now + COOLDOWNS[selectedChar].o * (selectedBot === 'anh' ? 1.5 : 1);
}

/**
 * GAME LOOP
 */

function update(timestamp) {
    if (!gameActive) return;
    
    // Calculate delta time for frame-independent movement
    if (!lastUpdateTime) lastUpdateTime = timestamp;
    deltaTime = Math.min(timestamp - lastUpdateTime, 50); // Cap at 50ms to prevent huge jumps
    lastUpdateTime = timestamp;
    
    const now = Date.now();
    const elapsed = now - startTime;
    const isHard = gameMode === 'hard';
    const isRageable = (selectedBot !== 'anh');
    // Calculate time scale based on target FPS
    const timeScale = deltaTime / TARGET_FRAME_TIME;
    // BOT STATES
    const rageCycle = 15000 - (selectedBot === 'luom' ? 5000 : 0) - (isHard ? 2000 : 0);
    const rageDuration = 5000;
    const isCommonRage = isRageable && elapsed > 10000 && (elapsed % rageCycle) > (rageCycle - rageDuration);
    // BOT Specialty Logic
    // Queen delays the player for 3 seconds
    if (selectedBot === 'quyen' && !player.isDelayed && elapsed > 5000 && (elapsed % (10000 + 1500 * currentLevel)) < 50) {
        player.isDelayed = true;
        player.delayEnd = now + 3000;
        document.getElementById('warning-flash').classList.add('delay-warning');
        playSound('assets/delaying.mp3', 0.9);
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
    let tick = 500 - currentLevel * 22.5 - (isCommonRage ? 8 * currentLevel : 0) - (isHard ? 5 * currentLevel : 3 * currentLevel);
    if (selectedBot === 'luom' && elapsed > tick && !(player.isQuangGravity && now < player.quangGravityEnd)) {
        const luomDur = (isHard ? 85 : 65) + (isCommonRage ? (isHard ? 10 : 8) * currentLevel : 0);
        if ((elapsed % tick) < luomDur && !isLuomCanMove && freezeEnd < now && bots.length > 0) {
            isLuomCanMove = true;
            playSound('assets/ruler-slap.mp3', 0.075);
        }
    }

    const statusEl = document.getElementById('bot-status');
    if (isCommonRage) {
        statusEl.classList.remove('opacity-0');
        statusEl.innerText = "BOT RAGE! (2X SPEED)";
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
        if (selectedChar !== 'quang' && player.isSuperSlow && now < player.superSlowEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#c084fc';
            statusEl.innerText = "🐌 BỊ LÀM CHẬM! (0.25X TỐC ĐỘ)";
        } else if (selectedChar === 'tan' && player.isTanGod && now < player.tanGodEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#facc15';
            statusEl.innerText = "⚡ GOD MODE! (2X TỐC ĐỘ + BẤT TỬ)";
        } else if (selectedChar === 'tan' && player.isTanSharingan && now < player.tanSharinganEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#ef4444';
            statusEl.innerText = "👁 SHARINGAN! (BOT BỊ ĐÓNG BĂNG)";
        } else if (selectedChar === 'tan' && player.isTanHunter && now < player.tanHunterEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#f97316';
            statusEl.innerText = `🔥 HUNTER MODE!`;
        } else if (selectedChar === 'thoai' && player.isThoaiSlow && now < player.thoaisuperSlowEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#a78bfa';
            statusEl.innerText = '📻 MÌ TÔM! (BOT 0.25X TỐC ĐỘ)';
        } else if (selectedChar === 'thoai' && player.isThoaiBoosted && now < player.thoaiBoostedEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#22c55e';
            statusEl.innerText = '⚡ RAGE BAIT! (2X TỐC ĐỘ)';
        } else if (selectedChar === 'thoai' && player.isThoaiHunter && now < player.thoaiHunterEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#facc15';
            statusEl.innerText = '🎯 NGẮN THỌT! (HUNTER 3S)';
        } else if (selectedChar === 'thoai' && player.isThoaiPenalty && now < player.thoaiPenaltyEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#94a3b8';
            statusEl.innerText = '💀 XUI XẺO! (0.5X TỐC ĐỘ)';
        } else if (selectedChar === 'quang' && player.isQuangGravity && now < player.quangGravityEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#c084fc';
            statusEl.innerText = `🌀 LỰC HẤP DẪN (BẠN ĐANG THU HÚT BOT)`;
        } else if (selectedChar === 'quang' && player.isSuperSlow && now < player.superSlowEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#c084fc';
            statusEl.innerText = '🐌 TRỌNG LỰC PHẢN (0.25X TỐC ĐỘ)';
        } else if (selectedChar === 'trung' && player.isTrungWindGod && now < player.trungWindGodEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#38bdf8';
            statusEl.innerText = '🌬️ CON CỦA THẦN GIÓ! (2.5X TỐC ĐỘ + XUYÊN BOT)';
        } else if (selectedChar === 'trung' && player.isTrungTired && now < player.trungTiredEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#94a3b8';
            statusEl.innerText = '😮‍💨 MỆT RỒI... (0.5X TỐC ĐỘ)';
        } else if (selectedChar === 'trung' && player.isTrungRasengan && now < player.trungRasenganEnd) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#7dd3fc';
            statusEl.innerText = '🌀 RASENGAN! (DẪN CẦU GIÓ TẤN CÔNG BOT)';
        } else {
            statusEl.style.color = '';
            statusEl.classList.add('opacity-0');
        }
    }

    // SPAWN
    const maxBots = (isHard ? [5, 7, 11, 15, 18][currentLevel - 1] : [3, 6, 9, 12, 15][currentLevel - 1]);
    const spawnInterval = (isHard ? 2500 : 4000) - (selectedBot == 'luom' ? 1250 : 0);
    if (elapsed > 2000 - (selectedBot == 'luom' ? 1250 : 0) && (bots.length < maxBots) && (now - lastBotSpawnTime > spawnInterval)) {
        bots.push({
            x: 1.5, y: 1.5, delayUntil: now + 500 
                                        + ((selectedBot == 'luom' || selectedBot == 'tin') ? 250 : 0), nextPathUpdate: 0,
            currentPath: [], rageUntil: 0,
            superRageStart: 0, superRageEnd: 0,
            isDead: false
        });
        spawnShockwave(1.5, 1.5, '#ef4444');
        lastBotSpawnTime = now;
    }

    // PLAYER MOVE
    let baseSpd = isHard ? 0.12 : 0.06 + ((isHard ? 0.05 : 0.015) * currentLevel);
    let mult = 1;
    player.isMoving = false;
    if (selectedChar === 'quang') mult *= 0.75;
    if (player.isParrySuccess) {
        player.isFast = true;
        player.fastEnd = now + 1500;
        player.isParrySuccess = false;
        iCD = Math.max(iCD - COOLDOWNS[selectedChar].i * (selectedBot === 'anh' ? 1.5 : 1) / 2, now);
    }
    if (player.isDelayed) mult = 0;
    else if (player.isParrying) mult = 0.015;
    else {
        if (player.isFast) mult *= 1.15;
        if (player.isCoffee) mult *= 1.25;
        if (player.isMedalSpeed) mult *= 2.0;
        if (player.isUlt) mult *= (selectedChar === 'dang' ? 2.75 : 1.6);
        if (player.isSuperSlow && now < player.superSlowEnd) mult *= 0.25;
        if (player.isSlow && now < player.slowEnd) mult *= 0.525;
        if (selectedChar === 'tan' && player.isTanGod && now < player.tanGodEnd) mult *= 2.0;
        if (selectedChar === 'tan' && player.isTanHunter && now < player.tanHunterEnd)
            mult *= (1.0 + player.tanUltKills * 0.25);
        if (selectedChar === 'thoai' && player.isThoaiBoosted && now < player.thoaiBoostedEnd) mult *= 2.0;
        if (selectedChar === 'thoai' && player.isThoaiPenalty && now < player.thoaiPenaltyEnd) mult *= 0.5;
        if (selectedChar === 'trung' && player.isTrungWindGod && now < player.trungWindGodEnd) mult *= 2.5;
        if (selectedChar === 'trung' && player.isTrungTired && now < player.trungTiredEnd) mult *= 0.5;
    }
    let pSpd = baseSpd * mult * timeScale;
    if (pSpd > 0) {
        if (keys.w && !checkCollision(player.x, player.y - pSpd)) {player.y -= pSpd; player.isMoving = true;}
        if (keys.s && !checkCollision(player.x, player.y + pSpd)) {player.y += pSpd; player.isMoving = true;}
        if (keys.a && !checkCollision(player.x - pSpd, player.y)) {player.x -= pSpd; player.isMoving = true;}
        if (keys.d && !checkCollision(player.x + pSpd, player.y)) {player.x += pSpd; player.isMoving = true;}
    }
    // give the player an aura when invincible
    if (player.isInvincible) {
        spawnTrail(player.x, player.y, 'rgba(255,255,255,0.5)');
    }
    if (selectedChar === 'tan' && player.isTanGod && now < player.tanGodEnd) {
        spawnTrail(player.x, player.y, 'rgba(250,204,21,0.7)');
    }
    if (selectedChar === 'tan' && player.isTanHunter && now < player.tanHunterEnd) {
        spawnTrail(player.x, player.y, 'rgba(239,68,68,0.8)');
    }
    if (selectedChar === 'thoai' && player.isThoaiHunter && now < player.thoaiHunterEnd) {
        spawnTrail(player.x, player.y, 'rgba(250,204,21,0.8)');
    }
    if (selectedChar === 'trung' && player.isTrungWindGod && now < player.trungWindGodEnd) {
        spawnTrail(player.x, player.y, 'rgba(56,189,248,0.7)');
    }
    if (selectedChar === 'trung' && player.isTrungRasengan && now < player.trungRasenganEnd) {
        // Rasengan ball follows close to player (offset slightly in movement direction)
        const rdx = keys.a ? -1 : (keys.d ? 1 : 0);
        const rdy = keys.w ? -1 : (keys.s ? 1 : 0);
        const followSpeed = 0.18;
        const targetX = player.x + (rdx !== 0 || rdy !== 0 ? rdx * 1.0 : 0);
        const targetY = player.y + (rdx !== 0 || rdy !== 0 ? rdy * 1.0 : 1.0);
        if (player.isMoving) {
            player.trungRasenganX += (targetX - player.trungRasenganX) * followSpeed;
            player.trungRasenganY += (targetY - player.trungRasenganY) * followSpeed;
        }
        // Check if rasengan hits any bot
        bots.forEach(b => {
            const d = Math.sqrt((b.x - player.trungRasenganX) ** 2 + (b.y - player.trungRasenganY) ** 2);
            if (d < 0.8 && !b.trungRasenganHit) {
                b.trungRasenganHit = true;
                // This bot: 0.25x speed for 30s
                b.trungRasenganSlowUntil = now + 30000;
                // Push this bot far
                const bddx = b.x - player.trungRasenganX, bddy = b.y - player.trungRasenganY;
                const bd = Math.sqrt(bddx * bddx + bddy * bddy) || 1;
                b.x = Math.max(1, Math.min(COLS - 2, b.x + (bddx / bd) * 6));
                b.y = Math.max(1, Math.min(ROWS - 2, b.y + (bddy / bd) * 6));
                // All other bots: pushed + 0.5x for 3s
                bots.forEach(ob => {
                    if (ob !== b) {
                        const oddx = ob.x - player.trungRasenganX, oddy = ob.y - player.trungRasenganY;
                        const od = Math.sqrt(oddx * oddx + oddy * oddy) || 1;
                        ob.x = Math.max(1, Math.min(COLS - 2, ob.x + (oddx / od) * 4));
                        ob.y = Math.max(1, Math.min(ROWS - 2, ob.y + (oddy / od) * 4));
                        ob.trungRasenganSlowOtherUntil = now + 3000;
                    }
                });
                shakeAmount = 25;
                for (let i = 0; i < 10; i++) {
                    setTimeout(() => spawnShockwave(player.trungRasenganX, player.trungRasenganY, i % 2 ? '#38bdf8' : '#ffffff'), i * 50);
                }
                playSound('assets/rasengan-sound-effect.mp3', 0.6);
                player.isTrungRasengan = false;
            }
        });
        // Resolve bots in walls after push
        bots.forEach(b => {
            if (checkCollision(b.x, b.y)) {
                const dirs = [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]];
                for (let dist = 0.1; dist < 5; dist += 0.1) {
                    for (let [ddx, ddy] of dirs) {
                        if (!checkCollision(b.x + ddx * dist, b.y + ddy * dist)) {
                            b.x += ddx * dist; b.y += ddy * dist; break;
                        }
                    }
                    if (!checkCollision(b.x, b.y)) break;
                }
            }
        });
    }
    resolveWallStick();

    // BOT MOVE
    let bSpdBase = (isHard ? 0.09 : 0.065) + (currentLevel * (isHard ? 0.0125 : 0.01));
    if (selectedBot === 'tin') bSpdBase *= (isHard ? 2.0 : 1.75);
    if (selectedBot === 'luom') bSpdBase = (isLuomCanMove ? (isHard ? 1.25 : 1.1) : 0);
    if ((selectedBot === 'quyen' || selectedBot === 'anh') && isHard) bSpdBase *= 1.5;

    bots.forEach(b => {
        if (b.x <= 0 || b.x > COLS - 1 || b.y <= 0 || b.y > ROWS - 1) {
            b.isDead = true;
            return;
        }
        const superEnraged = (now > b.superRageStart && now < b.superRageEnd) && isRageable;
        let finalBSpd = bSpdBase * timeScale;
        if (superEnraged) finalBSpd *= (selectedBot === 'luom' ? 4.0 : 3.0);
        else if (isCommonRage) finalBSpd *= 2.0;
        if (b.isSlow) finalBSpd *= 0.35;
        // Thoai [Y]: slow bots
        if (selectedChar === 'thoai' && b.thoaiSlowUntil && now < b.thoaiSlowUntil) finalBSpd *= 0.25;
        // Quang [Y] earthquake slow (0.25x for 2s after 3s delay)
        if (b.quangEarthquakeSlowUntil && now < b.quangEarthquakeSlowUntil && now >= (b.delayUntil || 0)) finalBSpd *= 0.25;
        // Quang [U] gravity frozen (bots can't move)
        if (b.quangGravityUntil && now < b.quangGravityUntil) finalBSpd = 0;
        if (now >= b.slowEnd) b.isSlow = false;
        // Trung [O] Rasengan: direct hit bot 0.25x for 30s, others 0.5x for 3s
        if (b.trungRasenganSlowUntil && now < b.trungRasenganSlowUntil) finalBSpd *= 0.25;
        if (b.trungRasenganSlowOtherUntil && now < b.trungRasenganSlowOtherUntil) finalBSpd *= 0.5;
        if (isLuomCanMove){
            spawnTrail(b.x, b.y, '#ef4444');
        };
        traps.forEach((t, idx) => {
            if (Math.sqrt((b.x - t.x) ** 2 + (b.y - t.y) ** 2) < 0.6) {
                b.delayUntil = now + (isHard ? 3000 : 3500);
                spawnShockwave(t.x, t.y, '#fff');
                traps.splice(idx, 1);
                b.superEnraged = true;
                b.superRageStart = now + (isHard ? 3000 : 3500);
                b.superRageEnd = now + (isHard ? 3000 : 3500) + 5000;
            }
        });

        if (now > freezeEnd && now > (b.delayUntil || 0)) {
            let target = (decoys.length > 0) ? decoys[0] : player;
            if (now > b.nextPathUpdate || b.currentPath.length === 0) {
                b.currentPath = getPath(b.x, b.y, target.x, target.y);
                b.nextPathUpdate = now + (isCommonRage ? 350 : 500);
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
            if ((selectedChar === 'tan' && player.isTanHunter && now < player.tanHunterEnd) ||
                (selectedChar === 'thoai' && player.isThoaiHunter && now < player.thoaiHunterEnd)) {
                spawnShockwave(b.x, b.y, '#facc15');
                spawnShockwave(b.x, b.y, '#ef4444');
                shakeAmount = 15;
                playSound('assets/kill.mp3');
                b.isDead = true;
            } else if (player.isShield && now < player.shieldEnd) {
                player.isShield = false;
                b.delayUntil = now + (isHard ? 2500 : 3500);
                spawnShockwave(player.x, player.y, '#fbbf24');
            } else if (player.isQuangGravity && now < player.quangGravityEnd) {
                b.isDead = true;
                playSound('assets/nom.mp3');
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
                const parry = document.getElementById('parry-flash');
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
                playSound('assets/parry.mp3');
            } else if (freezeEnd < now && !player.isInvincible && !player.isTanGod && !player.isGhost && !player.isQuangJumping) {
                endGame(false, selectedBot);
                playSound('assets/kill.mp3');
            }
        }
    });
    let lpbots = bots.length;
    bots = bots.filter(b => !b.isDead);
    if (lpbots > bots.length){
        player.countKills = lpbots - bots.length
        const kmult = (selectedChar === 'quang' ? 0.03 : 0.25) * player.countKills;
        yCD = Math.max(now, yCD - COOLDOWNS[selectedChar].y * kmult);
        uCD = Math.max(now, uCD - COOLDOWNS[selectedChar].u * kmult);
        iCD = Math.max(now, iCD - COOLDOWNS[selectedChar].i * kmult);
        oCD = Math.max(now, oCD - COOLDOWNS[selectedChar].o * kmult);
        player.countKills = 0;
    }
    // BLACK HOLE update (Thoai [O] and Quang [I])
    // Handle mega black hole explosion before filter
    blackholes.forEach(bh => {
        if (!bh.exploded && now >= bh.lifeEnd) {
            bh.exploded = true;
            // Explode: slow all bots 0.5x for 2s
            bots.forEach(b => {
                b.quangEarthquakeSlowUntil = now + 2000;
            });
            shakeAmount = 60;
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    spawnShockwave(bh.x, bh.y, i % 3 === 0 ? '#000' : (i % 3 === 1 ? '#4c1d95' : '#c084fc'));
                }, i * 50);
            }
            playSfx(30, 'sawtooth', 1.0, 0.5, 15);
        }
    });
    blackholes = blackholes.filter(bh => now < bh.lifeEnd && !bh.exploded);
    blackholes.forEach(bh => {
        bh.radius = Math.min(bh.radius + 0.25, 8);
        bots.forEach(b => {
            const dx = bh.x - b.x, dy = bh.y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 0.4) {
                b.isDead = true;
                spawnShockwave(bh.x, bh.y, '#7c3aed');
                spawnShockwave(bh.x, bh.y, '#000');
                playSound('assets/kill.mp3', 0.8);
            } else if (d < bh.radius) {
                const pullStr = 0.04 * (1 - d / bh.radius);
                b.x += (dx / d) * pullStr * 5;
                b.y += (dy / d) * pullStr * 5;
            }
        });
        bots = bots.filter(b => !b.isDead);
    });

    if (selectedChar === 'quang' && player.isQuangJumping && now >= player.quangJumpEnd) {
        player.isQuangJumping = false;
        if (Math.floor(player.x) > COLS - 2) player.x = COLS - 2;
        if (Math.floor(player.y) > ROWS - 2) player.y = ROWS - 2;
        const px = Math.floor(player.x), py = Math.floor(player.y);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx2 = -1; dx2 <= 1; dx2++) {
                const tx = px + dx2, ty = py + dy;
                if (tx > 0 && tx < COLS - 1 && ty > 0 && ty < ROWS - 1 && (maze[ty][tx] === '#' || maze[ty][tx] === 'a')) {
                    maze[ty][tx] = '.';
                }
            }
        }
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#c1c1c1' : '#a6a6a6');
                shakeAmount = 50 - i * 10;
            }, i * 50);
        }
        shakeAmount = 250;
        playSound('assets/landing.mp3', 0.85);
        if (checkCollision(player.x, player.y)) {
            let dirs = [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]];
            for (let dist = 0.1; dist < 8; dist += 0.1) {
                for (let [dx, dy] of dirs) {
                    if (!checkCollision(player.x + dx * dist, player.y + dy * dist)) {
                        player.x += dx * dist;
                        player.y += dy * dist;
                        break;
                    }
                }
            }
        }
        bots.forEach(b => {
            const bx = Math.floor(b.x), by = Math.floor(b.y);
            if (Math.abs(bx - px) <= 1 && Math.abs(by - py) <= 1) {
                b.isDead = true;
                spawnShockwave(b.x, b.y, '#d97706');
                spawnShockwave(b.x, b.y, '#fbbf24');
                shakeAmount = 15;
                playSound('assets/kill.mp3', 0.8);
            }
        });
        // Force redraw ngay lập tức
        createMazeCache();
        draw(isCommonRage & isRageable); // Vẽ với cache mới
    }

    // QUANG GRAVITY VISUAL: pull bots toward player while gravity active
    if (selectedChar === 'quang' && player.isQuangGravity && now < player.quangGravityEnd) {
        // Spawn periodic purple gravity rings
        if (Math.floor(now / 300) !== Math.floor((now - 16) / 300)) {
            spawnShockwave(player.x, player.y, 'rgba(139,92,246,0.5)');
        }
        // pulling logic: pull all bots toward player
        bots.forEach(b => {
            const dx = player.x - b.x;
            const dy = player.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.5) {
                const pullStrength = 0.08;
                b.x += (dx / dist) * pullStrength;
                b.y += (dy / dist) * pullStrength;
            }
        });
    }

    // LEVELING
    if (maze[Math.floor(player.y)][Math.floor(player.x)] === 'K' && !player.isQuangJumping) {
        if (currentLevel < 5) {
            currentLevel++;
            generateMaze();
            bots = [];
            trails = [];
            decoys = [];
            shockwaves = [];
            blackholes = [];
            traps = [];
            startTime = now;
            player.x = 1.5;
            player.y = 1.5;
            // reduce player CDs
            yCD = Math.max(now, yCD - COOLDOWNS[selectedChar].y * 0.25);
            uCD = Math.max(now, uCD - COOLDOWNS[selectedChar].u * 0.25);
            iCD = Math.max(now, iCD - COOLDOWNS[selectedChar].i * 0.25);
            oCD = Math.max(now, oCD - COOLDOWNS[selectedChar].o * 0.25);
            if (selectedChar === 'khang' && player.isUlt) {
                iCD = now;
                player.khangTraps += 5;
                player.ultEnd = now + 5000;
                document.getElementById('trap-counter').innerText = `BẪY CÒN LẠI: 5`;
            }
            playSound('assets/newlevel.mp3');
            document.getElementById('ui-level-text').innerText = `LEVEL ${currentLevel}`;
        } else {
            endGame(true, selectedBot);
            playSound('assets/winning.mp3');
        }
    }

    // CLEANUP
    shockwaves.forEach(s => { s.r += 10 * timeScale; s.life -= 0.025 * timeScale; });
    shockwaves = shockwaves.filter(s => s.life > 0).slice(-MAX_SHOCKWAVES); // Limit shockwaves
    trails.forEach(t => t.life -= 0.06 * timeScale);
    trails = trails.filter(t => t.life > 0).slice(-MAX_TRAILS); // Limit trails
    traps = traps.filter(t => now < t.life);
    if (shakeAmount > 0) shakeAmount *= 0.92;
    if (now > freezeEnd) freezeEnd = 0;
    if (now > player.parryEnd) {
        if (player.isParrying && !player.isParrySuccess) playSound('assets/missing.mp3', 0.8)
        player.isParrying = false;
    }
    if (now > player.fastEnd) player.isFast = false;
    if (now > player.slowEnd) player.isSlow = false;
    if (now > player.superSlowEnd) player.isSuperSlow = false;
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
    if (now > player.tanHunterEnd) player.isTanHunter = false;
    if (now > player.thoaisuperSlowEnd) player.isThoaiSlow = false;
    if (now > player.thoaiBoostedEnd) player.isThoaiBoosted = false;
    if (now > player.thoaiHunterEnd) { player.isThoaiHunter = false; player.isInvincible = false; }
    if (now > player.thoaiPenaltyEnd) player.isThoaiPenalty = false;
    if (now > player.quangGravityEnd) player.isQuangGravity = false;
    if (now > player.quangJumpEnd) player.isQuangJumping = false;
    if (now > player.trungWindGodEnd) { player.isTrungWindGod = false; player.isGhost = false; }
    if (now > player.trungTiredEnd) player.isTrungTired = false;
    if (now > player.trungRasenganEnd) player.isTrungRasengan = false;

    if (player.isUlt) {
        let color = selectedChar === 'dang' ? '#06b6d4' : (selectedChar === 'khang' ? '#fff' : '#6366f1');
        spawnTrail(player.x, player.y, color);
    }
    if (selectedChar === 'quang' && player.isQuangJumping && now < player.quangJumpEnd) {
        spawnTrail(player.x, player.y, 'rgba(251,191,36,0.7)');
    }
    if (selectedChar === 'quang' && player.isQuangGravity && now < player.quangGravityEnd) {
        spawnTrail(player.x, player.y, 'rgba(139,92,246,0.6)');
    }
    decoys = decoys.filter(d => now < d.lifeEnd);

    updateUI(now);
    draw(isCommonRage & isRageable);
    requestAnimationFrame(update);

    var thisFrameTime = (thisLoop = new Date) - lastLoop;
    frameTime += (thisFrameTime - frameTime) / filterStrength;
    lastLoop = thisLoop;
    if (debugmode) {
        const debug = document.getElementById('debug');
        debug.classList.remove('hidden');
        debug.innerText = `X: ${player.x.toFixed(3)} ; Y: ${player.y.toFixed(3)}`
                        + `\nSpeed: ${pSpd.toFixed(5)}`
                        + `\nIsMoving: ${player.isMoving}`;
    }
}

/**
 * RENDER
 */
function drawEntity(x, y, color, eyeColor, isBot = false, isEnraged = false) {
    const size = (isBot ? 0.75 : 0.6) * TILE_SIZE;
    if (!isBot && player.isParrying && Date.now() < player.parryEnd) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 20; ctx.shadowColor = '#ffffff'; }
        ctx.strokeRect(x * TILE_SIZE - size * 0.8, y * TILE_SIZE - size * 0.8, size * 1.6, size * 1.6);
        ctx.shadowBlur = 0;
    }
    if (!isBot && player.isShield && Date.now() < player.shieldEnd) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 20; ctx.shadowColor = '#fbbf24'; }
        ctx.strokeRect(x * TILE_SIZE - size * 0.8, y * TILE_SIZE - size * 0.8, size * 1.6, size * 1.6);
        ctx.shadowBlur = 0;
    }
    if (isBot && isEnraged) {
        ctx.fillStyle = '#f97316';
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 25; ctx.shadowColor = '#f97316'; }
    }
    else {
        ctx.fillStyle = color;
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle; }
    }

    if (!isBot && player.isQuangJumping && Date.now() < player.quangJumpEnd){
        // draw bigger entity + shadow on the ground
        const jumpSize = size * 1.8;
        const jumpY = y * TILE_SIZE + TILE_SIZE * 0.3;
        
        // Shadow on the ground (ellipse)
        if (ENABLE_SHADOW_EFFECTS) { 
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE * 0.25, jumpSize * 0.4, jumpSize * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        // Bigger entity in the air
        ctx.fillStyle = color;
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 25; ctx.shadowColor = '#fbbf24'; }
        ctx.fillRect(x * TILE_SIZE - jumpSize / 2, y * TILE_SIZE - jumpSize / 2 - TILE_SIZE * 0.3, jumpSize, jumpSize);
        ctx.shadowBlur = 0;
        
        // Eyes (slightly higher due to jump)
        ctx.fillStyle = eyeColor;
        ctx.fillRect(x * TILE_SIZE - jumpSize * 0.25, y * TILE_SIZE - jumpSize * 0.2 - TILE_SIZE * 0.3, jumpSize * 0.2, jumpSize * 0.2);
        ctx.fillRect(x * TILE_SIZE + jumpSize * 0.05, y * TILE_SIZE - jumpSize * 0.2 - TILE_SIZE * 0.3, jumpSize * 0.2, jumpSize * 0.2);
    } else {
        ctx.fillRect(x * TILE_SIZE - size / 2, y * TILE_SIZE - size / 2, size, size);
        ctx.shadowBlur = 0;
        ctx.fillStyle = (isBot && isEnraged) ? '#fff' : eyeColor;
        ctx.fillRect(x * TILE_SIZE - size * 0.25, y * TILE_SIZE - size * 0.2, size * 0.2, size * 0.2);
        ctx.fillRect(x * TILE_SIZE + size * 0.05, y * TILE_SIZE - size * 0.2, size * 0.2, size * 0.2);
    }
}

function draw(inRage) {
    ctx.save();
    if (shakeAmount > 1) ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use cached maze rendering for performance
    if (mazeCache) {
        ctx.drawImage(inRage && mazeCacheRage ? mazeCacheRage : mazeCache, 0, 0);
    } else {
        // Fallback: draw maze directly if cache not available
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
                    if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 20; ctx.shadowColor = '#eab308'; }
                    ctx.beginPath();
                    ctx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    traps.forEach(t => {
        ctx.fillStyle = (t.isGlowing ? '#ffffff' : '#505050');
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 10; ctx.shadowColor = (t.isGlowing ? '#ffffff' : '#505050'); }
        ctx.fillRect(t.x * TILE_SIZE - 6, t.y * TILE_SIZE - 6, 12, 12);
        ctx.shadowBlur = 0;
    });

    // Draw black holes (Thoai [O] and Quang [I] mega)
    const nowDraw = Date.now();
    blackholes.forEach(bh => {
        const cx = bh.x * TILE_SIZE, cy = bh.y * TILE_SIZE;
        const pulse = 0.7 + 0.3 * Math.sin(nowDraw / 120);
        const innerColor = 'rgba(76,29,149,0.95)';
        const glowColor = '#1e1b4b';
        const ringColor = `rgba(109, 40, 217, ${0.5 + 0.3 * pulse})`;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bh.radius * TILE_SIZE);
        grad.addColorStop(0, innerColor);
        grad.addColorStop(0.4, 'rgba(0,0,0,0.85)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(bh.radius * TILE_SIZE, TILE_SIZE * 0.8), 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, TILE_SIZE * 0.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 60; ctx.shadowColor = glowColor; }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(nowDraw / 180);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE * 1.0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.rotate(-nowDraw / 220);
        ctx.strokeStyle = `rgba(139,92,246,${0.3 * pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
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

    let pCol = selectedChar === 'khang' ? '#22c55e' : (selectedChar === 'dang' ? '#06b6d4' : (selectedChar === 'loi' ? '#6366f1' : (selectedChar === 'thoai' ? '#a78bfa' : (selectedChar === 'quang' ? '#d97706' : (selectedChar === 'trung' ? '#38bdf8' : '#f97316')))));
    if (player.isUlt && selectedChar === 'dang') pCol = '#fbbf24';
    if (player.isDelayed) pCol = '#475569';
    if (player.isParrying) pCol = '#7ec8d5';
    if (player.isGhost && selectedChar === 'dang') pCol = 'rgba(6, 182, 212, 0.5)';
    if (selectedChar === 'tan' && player.isTanGod && Date.now() < player.tanGodEnd) pCol = '#facc15';
    if (selectedChar === 'tan' && player.isTanHunter && Date.now() < player.tanHunterEnd) pCol = '#ef4444';
    if (selectedChar === 'thoai' && player.isThoaiHunter && Date.now() < player.thoaiHunterEnd) pCol = '#facc15';
    if (selectedChar === 'thoai' && player.isThoaiBoosted && Date.now() < player.thoaiBoostedEnd) pCol = '#22c55e';
    if (selectedChar === 'thoai' && player.isThoaiPenalty && Date.now() < player.thoaiPenaltyEnd) pCol = '#475569';
    if (selectedChar === 'quang' && player.isQuangGravity && Date.now() < player.quangGravityEnd) pCol = '#c084fc';
    if (selectedChar === 'quang' && player.isQuangJumping && Date.now() < player.quangJumpEnd) pCol = '#fbbf24';
    if (selectedChar === 'trung' && player.isTrungWindGod && Date.now() < player.trungWindGodEnd) pCol = '#e0f2fe';
    if (selectedChar === 'trung' && player.isTrungTired && Date.now() < player.trungTiredEnd) pCol = '#475569';
    if (selectedChar === 'tan' && player.isTanSharingan && Date.now() < player.tanSharinganEnd) {
        // Sharingan: tint the whole canvas red
        ctx.save();
        ctx.fillStyle = 'rgba(180, 0, 0, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    if (selectedChar === 'quang' && player.isQuangGravity && Date.now() < player.quangGravityEnd) {
        // Gravity: tint the whole canvas purple
        ctx.save();
        ctx.fillStyle = 'rgba(88, 28, 135, 0.18)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    if (selectedChar === 'trung' && player.isTrungWindGod && Date.now() < player.trungWindGodEnd) {
        // Wind God: tint canvas light blue
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    drawEntity(player.x, player.y, pCol, (player.isGhost || player.isDelayed) ? 'transparent' : '#454545');

    // Draw Rasengan wind ball
    if (selectedChar === 'trung' && player.isTrungRasengan && Date.now() < player.trungRasenganEnd) {
        const rx = player.trungRasenganX * TILE_SIZE;
        const ry = player.trungRasenganY * TILE_SIZE;
        const t2 = Date.now();
        const pulse = 0.7 + 0.3 * Math.sin(t2 / 80);
        const spin = t2 / 120;
        // Outer spinning ring
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(spin);
        ctx.strokeStyle = `rgba(56,189,248,${0.6 + 0.3 * pulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.rotate(-spin * 2);
        ctx.strokeStyle = `rgba(186,230,253,${0.4 + 0.3 * pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        // Core glow
        const rGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, TILE_SIZE * 0.4);
        rGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
        rGrad.addColorStop(0.3, 'rgba(125,211,252,0.7)');
        rGrad.addColorStop(1, 'rgba(56,189,248,0)');
        ctx.beginPath();
        ctx.arc(rx, ry, TILE_SIZE * 0.4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = rGrad;
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 20; ctx.shadowColor = '#38bdf8'; }
        ctx.fill();
        ctx.shadowBlur = 0;
    }

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
        setTimeout(() => { playSound('assets/winning.mp3'); }, 100);
    } else {
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
    blackholes = [];
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
        isMoving: false, isCoffee: false, isGhost: false, isShield: false, isUlt: false,
        ultEnd: 0, roadEnd: 0, shieldEnd: 0, ghostEnd: 0, coffeeEnd: 0,
        khangDashCount: 0, khangTraps: 5,
        isMedalSpeed: false, medalSpeedEnd: 0,
        isDelayed: false, delayEnd: 0,
        isParrying: false, parryEnd: 0,
        isInvincible: false, invincibleEnd: 0,
        isParrySuccess: false,
        isSuperSlow: false, superSlowEnd: 0,
        isSlow: false, slowEnd: 0,
        isFast: false, fastEnd: 0,
        isTanGod: false, tanGodEnd: 0,
        isTanSharingan: false, tanSharinganEnd: 0,
        isTanHunter: false, tanHunterEnd: 0,
        countKills: 0,
        isThoaiSlow: false, thoaisuperSlowEnd: 0,
        isThoaiBoosted: false, thoaiBoostedEnd: 0,
        isThoaiHunter: false, thoaiHunterEnd: 0,
        isThoaiPenalty: false, thoaiPenaltyEnd: 0,
        isQuangJumping: false, quangJumpEnd: 0,
        isQuangGravity: false, quangGravityEnd: 0,
        isTrungWindGod: false, trungWindGodEnd: 0,
        isTrungTired: false, trungTiredEnd: 0,
        isTrungHasagi: false, trungHasagiEnd: 0,
        isTrungDashing: false, trungDashEnd: 0,
        isTrungRasengan: false, trungRasenganEnd: 0,
        trungRasenganX: 0, trungRasenganY: 0
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
    document.getElementById('ui-level-text').innerText = `LEVEL ${currentLevel}`;
    gameActive = true;
    startTime = Date.now();
    update();
    playSfx(300, 'sine', 0.5, 0.1, 600);
}

window.selectChar = (c) => {
    selectedChar = c;
    const colors = { khang: '#22c55e', dang: '#06b6d4', loi: '#6366f1', tan: '#f97316', thoai: '#a78bfa', quang: '#d97706', trung: '#38bdf8' };
    const charOrder = ['khang', 'dang', 'loi', 'tan', 'thoai', 'quang', 'trung'];
    
    // Update tab buttons
    charOrder.forEach((id, index) => {
        const tab = document.querySelector(`#char-tabs button[onclick="selectChar('${id}')"]`);
        if (!tab) return;
        if (id === c) {
            tab.classList.remove('border-slate-700');
            tab.classList.add(`border-${id === 'khang' ? 'green-400' : id === 'dang' ? 'cyan-400' : id === 'loi' ? 'indigo-400' : id === 'tan' ? 'orange-400' : id === 'thoai' ? 'violet-300' : id === 'trung' ? 'sky-400' : 'amber-500'}`);
            tab.style.transform = 'scale(1.25)';
            tab.style.padding = '3px';
            tab.style.boxShadow = `0 0 25px ${colors[id]}`;
        } else {
            tab.classList.add('border-slate-700');
            tab.classList.remove('border-green-400', 'border-cyan-400', 'border-indigo-400', 'border-orange-400', 'border-violet-300', 'border-amber-500', 'border-sky-400');
            tab.style.transform = 'scale(1)';
            tab.style.padding = '0px';
            tab.style.boxShadow = 'none';
        }
    });
    
    // Update character display
    charOrder.forEach(id => {
        const display = document.getElementById('char-display-' + id);
        if (display) {
            if (id === c) {
                display.classList.remove('hidden');
                display.classList.add('block');
                display.style.animation = 'fadeIn 0.3s ease-out, wobble 1s';
            } else {
                display.classList.add('hidden');
                display.classList.remove('block');
            }
        }
    });
};

window.changeCharTab = (dir) => {
    const charOrder = ['khang', 'dang', 'loi', 'thoai', 'quang', 'tan', 'trung'];
    const currentIndex = charOrder.indexOf(selectedChar);
    let newIndex = currentIndex + dir;
    if (newIndex < 0) newIndex = charOrder.length - 1;
    if (newIndex >= charOrder.length) newIndex = 0;
    selectChar(charOrder[newIndex]);
};

// Initialize character display on load
window.addEventListener('DOMContentLoaded', () => {
    selectChar('khang');
});

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

var fpsOut = document.getElementById('fps-counter');
setInterval(function(){
    fpsOut.innerHTML = (frameTime ? Math.round(1000/frameTime) : "-") + " fps";
}, 500);
window.addEventListener('resize', initCanvas);
document.getElementById('vers').innerText = 'V' + version;
selectChar('khang');
selectMode('normal');
selectBot('quyen');

// Load settings from file on startup
loadSettings();

/**
 * SETTINGS SYSTEM
 */
function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    loadSettingsToUI();
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function loadSettingsToUI() {
    // Load current values to UI
    document.getElementById('setting-fps').value = TARGET_FPS;
    document.getElementById('setting-debug').innerText = debugmode ? 'ON' : 'OFF';
    document.getElementById('setting-shadow').innerText = ENABLE_SHADOW_EFFECTS ? 'ON' : 'OFF';
    document.getElementById('setting-shockwaves').value = MAX_SHOCKWAVES;
    document.getElementById('setting-trails').value = MAX_TRAILS;
}

function toggleDebug() {
    const btn = document.getElementById('setting-debug');
    btn.innerText = btn.innerText === 'ON' ? 'OFF' : 'ON';
}

function toggleShadow() {
    const btn = document.getElementById('setting-shadow');
    btn.innerText = btn.innerText === 'ON' ? 'OFF' : 'ON';
}

function saveSettings() {
    const settings = {
        game: {
            targetFPS: parseInt(document.getElementById('setting-fps').value),
            debugMode: document.getElementById('setting-debug').innerText === 'ON'
        },
        visual: {
            enableShadowEffects: document.getElementById('setting-shadow').innerText === 'ON',
            maxShockwaves: parseInt(document.getElementById('setting-shockwaves').value),
            maxTrails: parseInt(document.getElementById('setting-trails').value),
            maxParticles: 50
        },
        difficulty: {
            gameMode: gameMode,
            selectedBot: selectedBot,
            selectedChar: selectedChar
        }
    };

    // Save to localStorage (for web environment)
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    
    // Apply settings immediately
    applySettings(settings);
    
    closeSettings();
    console.log('Settings saved:', settings);
}

function applySettings(settings) {
    // Apply game settings
    if (settings.game) {
        TARGET_FPS = settings.game.targetFPS || 60;
        TARGET_FRAME_TIME = 1000 / TARGET_FPS;
        // Update global variable for debugmode
        window.debugmode = settings.game.debugMode !== undefined ? settings.game.debugMode : true;
    }
    
    // Apply visual settings
    if (settings.visual) {
        ENABLE_SHADOW_EFFECTS = settings.visual.enableShadowEffects !== undefined ? settings.visual.enableShadowEffects : false;
        MAX_SHOCKWAVES = settings.visual.maxShockwaves || 25;
        MAX_TRAILS = settings.visual.maxTrails || 20;
    }
}

function loadSettings() {
    try {
        // Try to load from localStorage first
        let settings = localStorage.getItem('gameSettings');
        
        if (settings) {
            settings = JSON.parse(settings);
            applySettings(settings);
            console.log('Settings loaded from localStorage');
        } else {
            // Try to fetch from file (for file:// protocol)
            fetch('setting.json')
                .then(response => response.json())
                .then(settings => {
                    applySettings(settings);
                    localStorage.setItem('gameSettings', JSON.stringify(settings));
                    console.log('Settings loaded from file');
                })
                .catch(() => {
                    console.log('Using default settings');
                });
        }
    } catch (e) {
        console.log('Using default settings');
    }
}

function resetSettings() {
    const defaultSettings = {
        game: {
            targetFPS: 60,
            debugMode: true
        },
        visual: {
            enableShadowEffects: false,
            maxShockwaves: 25,
            maxTrails: 20,
            maxParticles: 50
        },
        difficulty: {
            gameMode: 'normal',
            selectedBot: 'quyen',
            selectedChar: 'khang'
        }
    };
    
    localStorage.setItem('gameSettings', JSON.stringify(defaultSettings));
    applySettings(defaultSettings);
    loadSettingsToUI();
}
