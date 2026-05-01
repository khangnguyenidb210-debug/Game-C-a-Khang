/**
 * ENGINE & CONFIG
 */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const version = "1.2.1";

// GAME CONFIG - Tùy chỉnh tốc độ game (sẽ được load từ settings)
// Xem thêm trong phần SETTINGS SYSTEM ở cuối file

let ROWS, COLS, TILE_SIZE;
let maze = [];

let player = {
    x: 1.5, y: 1.5,
    isMoving: false, isCoffee: false, isGhost: false, isUlt: false,
    ultEnd: 0, roadEnd: 0, ghostEnd: 0, dangCoffeeEnd: 0,
    khangDashCount: 0, khangTraps: 5,
    isLoiSpeed: false, loiSpeedEnd: 0,
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
    countKills: 0, totalKills: 0,
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
    trungRasenganX: 0, trungRasenganY: 0,
    // Miss Anh skills - Red Light Green Light
    isAnhBlinded: false, anhBlindedEnd: 0,        // bị làm mù tầm nhìn
    isAnhRedLight: false,                         // đèn đỏ đang active
    anhLightPhase: 0,                             // phase hiện tại của đèn (1-4)
    anhLightCycle: 0,                             // chu kỳ đèn (mỗi chu kỳ 10s: 9s xanh - 1s đỏ)
    anhPenaltyStart: 0                            // thời điểm bắt đầu bị phạt
};

let bots = [], particles = [], decoys = [], trails = [], shockwaves = [], traps = [], blackholes = [], bounceObjects = [];
let gameActive = false, gamePaused = false, pauseStart = 0, startTime = 0, currentLevel = 1;
let selectedBot = 'quyen', selectedChar = 'khang', gameMode = 'normal';
let yCD = 0, uCD = 0, iCD = 0, oCD = 0, freezeEnd = 0, lastBotSpawnTime = 0;
let shakeAmount = 0, showRoad = false, objID = null;
let alarmSoundPlaying = false;
let lastAnhState = null, isStateChanged = false;
let isAnhBreak = false, isBreakingPlayed = true;
let isLuomMoveAudio = false, isRaging = false;

// Global variables for settings (can be modified by settings system)
var TARGET_FPS = 60;
var TARGET_FRAME_TIME = 1000 / TARGET_FPS;
var ENABLE_SHADOW_EFFECTS = false;
var DEBUG_MODE = false;
var MAX_SHOCKWAVES = 25;
var MAX_TRAILS = 20;
var MAX_PARTICLES = 50;
var MUTE_THEMES = false;
var MUTE_SFX = false;
var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;
var lastUpdateTime = 0, deltaTime = 0;
let mazeCache = null, mazeCacheRage = null; // Cache for rendered maze

const COOLDOWNS = {
    khang: { y: 6000, u: 15000, i: 4000, o: 20000 },
    dang: { y: 8000, u: 10000, i: 12000, o: 18000 },
    loi: { y: 12000, u: 8000, i: 8000, o: 20000 },
    tan:  { y: 12000, u: 15000, i: 18000, o: 30000 },
    thoai: { y: 6000, u: 8000, i: 12000, o: 28000 },
    quang: { y: 12000, u: 18000, i: 8000, o: 25000 },
    trung: { y: 15000, u: 12000, i: 8000, o: 18000 }
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
    player.ghostEnd += delta;
    player.dangCoffeeEnd += delta;
    player.loiSpeedEnd += delta;
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
    bounceObjects.forEach(b => b.lifeEnd += delta);
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
    if (!MUTE_SFX) playSfx(220, 'triangle', 0.25, 0.1);
}

function resumeGame() {
    if (!gamePaused) return;
    const delta = Date.now() - pauseStart;
    shiftTimers(delta);
    gamePaused = false;
    gameActive = true;
    setPauseOverlay(false);
    if (!MUTE_SFX) playSfx(440, 'triangle', 0.2, 0.12);
    update();
}

function togglePause() {
    if (!gameActive && !gamePaused) return;
    if (gamePaused) resumeGame();
    else pauseGame();
}

/**
 * AUDIO ENGINE (LEGACY)
 */

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

/**
 * AUDIO ENGINE (NEW)
 */
class AudioManager {
    constructor() {
        this.channels = {
            music: {},
            sfx: {},
            ui: {},
            ambient: {}
        };
        this.masterVolume = 1;
        this.channelVolume = {
            music: 1,
            sfx: 1,
            ui: 1,
            ambient: 1
        };

        this.loaded = 0;
        this.total = 0;
    }

    // PRELOAD
    preload(list, callback = null) {
        this.total = list.length;
        this.loaded = 0;
        for (const item of list) {
            this.load(
                item.channel,
                item.name,
                item.src,
                item.config,
                () => {
                    this.loaded++;
                    if (callback)
                        callback(this.loaded, this.total);

                    if (this.loaded === this.total) {
                        console.log("Toàn bộ âm thanh đã tải xong");
                    }
                }
            );
        }
    }

    // LOAD
    load(channel, name, src, config = {}, onLoaded = null) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = src;
        audio.volume = config.volume ?? 1;
        audio.loop = config.loop ?? false;
        audio.playbackRate = config.speed ?? 1;
        audio.addEventListener("canplaythrough", () => {
            if (onLoaded) onLoaded();
        }, { once: true });
        this.channels[channel][name] = {
            audio: audio,
            baseVolume: config.volume ?? 1,
            pitch: config.pitch ?? 1
        };

        this.updateVolume(channel, name);

        audio.load();
    }

    // PLAY
    play(channel, name) {
        const sound = this.channels[channel][name];
        if (!sound) return;
        sound.audio.currentTime = 0;
        sound.audio.play();
    }
    

    // STOP
    stop(channel, name) {
        const sound = this.channels[channel][name];
        if (!sound) return;

        sound.audio.pause();
        sound.audio.currentTime = 0;
    }

    stopChannel(channel) {
        if (!this.channels[channel]) return;
        for (let name in this.channels[channel]) {
            const sound = this.channels[channel][name];
            sound.audio.pause();
            sound.audio.currentTime = 0;
        }
    }

    // VOLUME
    updateVolume(channel, name) {
        const sound = this.channels[channel][name];
        if (!sound) return;
        sound.audio.volume =
            sound.baseVolume *
            this.channelVolume[channel] *
            this.masterVolume;
    }

    setMasterVolume(vol) {
        this.masterVolume = vol;
        for (let channel in this.channels)
            for (let name in this.channels[channel])
                this.updateVolume(channel, name);
    }

    setChannelVolume(channel, vol) {
        this.channelVolume[channel] = vol;
        for (let name in this.channels[channel])
            this.updateVolume(channel, name);
    }
}

const audio = new AudioManager();
audio.preload([
    // Quyen's audio
    {
        channel: "music",
        name: "quyen-chase",
        src: "assets/quyen/chase.mp3",
        config: { loop: true }
    },
    {
        channel: "sfx",
        name: "quyen-error1",
        src: "assets/quyen/error1.mp3",
        config: { volume: 0.6 }
    },
    {
        channel: "sfx",
        name: "quyen-error2",
        src: "assets/quyen/error2.mp3"
    },
    {
        channel: "sfx",
        name: "quyen-error3",
        src: "assets/quyen/error3.mp3",
        config: { volume: 0.7 }
    },
    // Anh's audio
    {
        channel: "music",
        name: "anh-chase",
        src: "assets/anh/chase.mp3",
        config: { loop: true }
    },
    {
        channel: "sfx", 
        name: "anh-tick1",
        src: "assets/anh/tick1.mp3"
    },
    {
        channel: "sfx", 
        name: "anh-tick2",
        src: "assets/anh/tick2.mp3",
        config: { volume: 0.85 }
    },
    {
        channel: "sfx", 
        name: "anh-tick3",
        src: "assets/anh/tick3.mp3",
        config: { volume: 0.85 }
    },
    {
        channel: "sfx", 
        name: "anh-tick4",
        src: "assets/anh/tick4.mp3",
        config: { volume: 0.85 }
    },
    {
        channel: "sfx", 
        name: "anh-breaking",
        src: "assets/anh/breaking.mp3",
        config: { volume: 0.9 }
    },
    // Luom's audio
    {
        channel: "music",
        name: "luom-chase",
        src: "assets/luom/chase.mp3",
        config: { volume: 0.85, loop: true }
    },
    {
        channel: "sfx",
        name: "luom-rage",
        src: "assets/luom/rage.mp3",
        config: { volume: 0.7 }
    },
    {
        channel: "sfx",
        name: "luom-move",
        src: "assets/luom/move.mp3",
        config: { volume: 0.7 }
    },
    // Tin's audio
    {
        channel: "music",
        name: "tin-chase",
        src: "assets/tin/chase.mp3",
        config: { volume: 0.7, loop: true }
    },
    // Khang's audio
    {
        channel: "sfx",
        name: "khang-dash1",
        src: "assets/khang/dash1.mp3"
    },
    {
        channel: "sfx",
        name: "khang-dash2",
        src: "assets/khang/dash2.mp3"
    },
    {
        channel: "sfx",
        name: "khang-letsgo",
        src: "assets/khang/lets-go.mp3"
    },
    {
        channel: "sfx",
        name: "khang-timestop",
        src: "assets/khang/time-stop.mp3"
    },
    {
        channel: "sfx",
        name: "khang-trapcaught",
        src: "assets/khang/trap-caught.mp3",
        config: { volume: 0.6 }
    },
    // Dang's audio
    {
        channel: "sfx",
        name: "dang-findpath",
        src: "assets/dang/find-path.mp3"
    },
    {
        channel: "sfx",
        name: "dang-missing",
        src: "assets/dang/missing.mp3"
    },
    {
        channel: "sfx",
        name: "dang-parrying",
        src: "assets/dang/parrying.mp3",
        config: { volume: 0.8 }
    },
    {
        channel: "sfx",
        name: "dang-parrysucess",
        src: "assets/dang/parry-sucess.mp3"
    },
    {
        channel: "sfx",
        name: "dang-punchsucess",
        src: "assets/dang/punch-sucess.mp3",
        config: { volume: 0.6 }
    },
    {
        channel: "sfx",
        name: "dang-weave",
        src: "assets/dang/weave.mp3"
    },
    // Loi's audio
    {
        channel: "sfx",
        name: "loi-speed",
        src: "assets/loi/speed.mp3"
    },
    {
        channel: "sfx",
        name: "loi-stagger",
        src: "assets/loi/stagger.mp3"
    },
    {
        channel: "sfx",
        name: "loi-teleport",
        src: "assets/loi/teleport.mp3",
        config: { volume: 0.8 }
    },
    {
        channel: "sfx",
        name: "loi-explode",
        src: "assets/loi/explode.mp3",
        config: { volume: 0.8 }
    },{
        channel: "sfx",
        name: "loi-pickup",
        src: "assets/loi/pick-up.mp3",
        config: { volume: 0.8 }
    },
    {
        channel: "sfx",
        name: "loi-whattheboom",
        src: "assets/loi/what-the-boom.mp3",
        config: { volume: 0.8 }
    },
    // Thoai's audio
    {
        channel: "sfx",
        name: "thoai-blackhole",
        src: "assets/thoai/black-hole.mp3",
        config: { volume: 0.7 }
    },
    {
        channel: "sfx",
        name: "thoai-mitombokhoradio",
        src: "assets/thoai/mi-tom-bo-kho-radio.mp3",
        config: { volume: 0.67 }
    },
    {
        channel: "sfx",
        name: "thoai-motcaichettruyenthong",
        src: "assets/thoai/mot-cai-chet-truyen-thong.mp3",
        config: { volume: 0.67 }
    },
    {
        channel: "sfx",
        name: "thoai-ragebait",
        src: "assets/thoai/ragebait.mp3"
    },
    {
        channel: "sfx",
        name: "thoai-ragebaitsucess",
        src: "assets/thoai/ragebait-sucess.mp3",
        config: { volume: 0.67 }
    },
    // Quang's audio
    {
        channel: "sfx",
        name: "quang-burps",
        src: "assets/quang/burps.mp3"
    },
    {
        channel: "sfx",
        name: "quang-landing",
        src: "assets/quang/landing.mp3"
    },
    {
        channel: "sfx",
        name: "quang-nom",
        src: "assets/quang/nom.mp3"
    },
    {
        channel: "sfx",
        name: "quang-stomp",
        src: "assets/quang/stomp.mp3"
    },
    {
        channel: "sfx",
        name: "quang-jump",
        src: "assets/quang/jump.mp3",
        config: { volume: 0.85 }
    },
    // Tan's audio
    {
        channel: "sfx",
        name: "tan-delete",
        src: "assets/tan/delete.mp3"
    },
    {
        channel: "sfx",
        name: "tan-hunter",
        src: "assets/tan/hunter.mp3"
    },
    {
        channel: "sfx",
        name: "tan-sasuke",
        src: "assets/tan/sasuke.mp3",
        config: { volume: 0.85 }
    },
    {
        channel: "sfx",
        name: "tan-sharingan",
        src: "assets/tan/sharingan.mp3"
    },
    // Trung's audio
    {
        channel: "sfx",
        name: "trung-thechildofthewindgod",
        src: "assets/trung/the-child-of-the-wind-god.mp3",
        config: { volume: 0.5 }
    },
    {
        channel: "sfx",
        name: "trung-rasengan",
        src: "assets/trung/rasengan.mp3",
        config: { volume: 0.7 }
    },
    {
        channel: "sfx",
        name: "trung-katanaschwing",
        src: "assets/trung/katana-schwing.mp3",
        config: { volume: 0.55 }
    },
    {
        channel: "sfx",
        name: "trung-hasagi",
        src: "assets/trung/hasagi.mp3",
        config: { volume: 0.8 }
    },
    {
        channel: "sfx",
        name: "trung-windhit",
        src: "assets/trung/wind-hit.mp3"
    },
    // Others audio
    {
        channel: "sfx",
        name: "click",
        src: "assets/sfx/click.mp3"
    },
    {
        channel: "sfx",
        name: "kill",
        src: "assets/sfx/kill.mp3"
    },
    {
        channel: "sfx",
        name: "rage1",
        src: "assets/sfx/rahhh.mp3"
    },
    {
        channel: "sfx",
        name: "rage2",
        src: "assets/sfx/waapp-angry.mp3"
    },
    // Themes
    {
        channel: "music",
        name: "mainmenu",
        src: "assets/themes/main-menu.mp3",
        config: { volume: 0.67, loop: true }
    },
    {
        channel: "music",
        name: "settingtheme1",
        src: "assets/themes/setting-theme1.mp3",
        config: { volume: 0.67, loop: true }
    },
    {
        channel: "music",
        name: "settingtheme2",
        src: "assets/themes/setting-theme2.mp3",
        config: { loop: true }
    },
    {
        channel: "music",
        name: "settingtheme3",
        src: "assets/themes/setting-theme3.mp3",
        config: { loop: true }
    },
    {
        channel: "music",
        name: "wintheme",
        src: "assets/themes/win-theme.mp3",
        config: { loop: true }
    },
    {
        channel: "music",
        name: "deaththeme",
        src: "assets/themes/death-theme.mp3",
        config: { loop: true }
    }
]);

document.onclick = () => {
    audio.play("sfx", "click");
};

// Cảnh báo phẫn nộ
function playAlarm() {
    if (alarmSoundPlaying) return;
    alarmSoundPlaying = true;
    if (!MUTE_SFX) playSfx(600, 'square', 0.5, 0.05, 800);
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

// Di chuyển player với cơ chế sát tường và trượt từng chút một
function movePlayerWithSlide(moveX, moveY, speed) {
    if (moveX === 0 && moveY === 0) return false;
    
    let moved = false;
    const stepSize = 0.02; // Bước di chuyển nhỏ để kiểm tra
    
    // Hàm thử di chuyển với slide dọc theo tường
    const tryMove = (dx, dy, primaryAxis) => {
        const fullDist = primaryAxis === 'x' ? Math.abs(moveX) * speed : Math.abs(moveY) * speed;
        const steps = Math.ceil(fullDist / stepSize);
        const stepX = (dx * speed) / steps;
        const stepY = (dy * speed) / steps;
        
        for (let i = 0; i < steps; i++) {
            const newX = player.x + stepX;
            const newY = player.y + stepY;
            
            if (!checkCollision(newX, newY)) {
                player.x = newX;
                player.y = newY;
                moved = true;
            } else {
                // Va chạm - thử slide dọc theo trục khác
                if (primaryAxis === 'x') {
                    // Đang di chuyển theo X, thử slide theo Y
                    if (dy === 0) {
                        // Thử lên/xuống một chút để sát tường
                        for (let offset = stepSize; offset < 0.5; offset += stepSize) {
                            if (!checkCollision(newX, player.y + offset)) {
                                player.y += offset;
                                moved = true;
                                break;
                            }
                            if (!checkCollision(newX, player.y - offset)) {
                                player.y -= offset;
                                moved = true;
                                break;
                            }
                        }
                    }
                } else {
                    // Đang di chuyển theo Y, thử slide theo X
                    if (dx === 0) {
                        for (let offset = stepSize; offset < 0.5; offset += stepSize) {
                            if (!checkCollision(player.x + offset, newY)) {
                                player.x += offset;
                                moved = true;
                                break;
                            }
                            if (!checkCollision(player.x - offset, newY)) {
                                player.x -= offset;
                                moved = true;
                                break;
                            }
                        }
                    }
                }
                // Dừng lại nếu không thể tiếp tục
                break;
            }
        }
    };
    
    // Xử lý di chuyển đường chéo
    if (moveX !== 0 && moveY !== 0) {
        const diagSpeed = speed * 0.707;
        
        // Thử đường chéo trực tiếp
        if (!checkCollision(player.x + moveX * diagSpeed, player.y + moveY * diagSpeed)) {
            player.x += moveX * diagSpeed;
            player.y += moveY * diagSpeed;
            moved = true;
        } else {
            // Thử từng trục riêng (slide dọc tường)
            // Thử X trước
            if (!checkCollision(player.x + moveX * speed, player.y)) {
                player.x += moveX * speed;
                moved = true;
            }
            // Thử Y sau
            if (!checkCollision(player.x, player.y + moveY * speed)) {
                player.y += moveY * speed;
                moved = true;
            }
        }
    } else {
        // Di chuyển thẳng (WASD) với slide từng chút một
        if (moveX !== 0) {
            tryMove(moveX, 0, 'x');
        }
        if (moveY !== 0) {
            tryMove(0, moveY, 'y');
        }
    }
    
    // Xử lý khi bị kẹt trong tường - dịch chuyển từng chút một để thoát
    if (checkCollision(player.x, player.y)) {
        const escapeDirs = [
            [stepSize, 0], [-stepSize, 0], [0, stepSize], [0, -stepSize],
            [stepSize, stepSize], [-stepSize, stepSize], [stepSize, -stepSize], [-stepSize, -stepSize]
        ];
        
        for (let [dx, dy] of escapeDirs) {
            if (!checkCollision(player.x + dx, player.y + dy)) {
                player.x += dx;
                player.y += dy;
                moved = true;
                break;
            }
        }
    }
    
    return moved;
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
        let isDashSucess = false;
        let dx = keys.a ? -1 : (keys.d ? 1 : 0), dy = keys.w ? -1 : (keys.s ? 1 : 0);
        if (!dx && !dy) dy = -1;
        for (let i = 0; i < 15; i++) {
            let nx = player.x + dx * 0.4, ny = player.y + dy * 0.4;
            if (!checkCollision(nx, ny)) {
                spawnTrail(player.x, player.y, isUlt ? 'rgba(255,255,255,0.6)' : 'rgba(34,197,94,0.3)');
                player.x = nx;
                player.y = ny;
                isDashSucess = true;
            } else break;
        }
        if (isUlt) {
            player.khangDashCount++;
            if (player.khangDashCount < 2) yCD = now + 400;
            else { player.khangDashCount = 0; yCD = now + 1500 * (selectedBot === 'anh' ? 1.25 : 1); }
        } else yCD = now + COOLDOWNS.khang.y * (selectedBot === 'anh' ? 1.25 : 1) * isDashSucess;
        if (isDashSucess) audio.play("sfx", `khang-dash${Math.random() < 0.5 ? 1 : 2}`);
    } else if (selectedChar === 'dang') {
        player.isCoffee = true;
        player.dangCoffeeEnd = now + 4000;
        yCD = now + COOLDOWNS.dang.y * (selectedBot === 'anh' ? 1.25 : 1);
        showRoad = true;
        player.roadEnd = now + 4000;
        audio.play("sfx", "dang-findpath");
    } else if (selectedChar === 'loi') {
        let dx = keys.a ? -1 : (keys.d ? 1 : 0), dy = keys.w ? -1 : (keys.s ? 1 : 0);
        if (!dx && !dy) dy = -1;
        const blinkDist = 3.5;
        let isTeleportSucess = false;
        spawnShockwave(player.x, player.y, '#6366f1');
        for (let d = blinkDist; d >= 0; d -= 0.5) {
            let tx = player.x + dx * d, ty = player.y + dy * d;
            if (!checkCollision(tx, ty)) { 
                spawnTrail(player.x, player.y, '#6366f1');
                player.x = tx; player.y = ty;
                isTeleportSucess = true;
                break; 
            }
        }
        spawnShockwave(player.x, player.y, '#6366f1');
        yCD = now + COOLDOWNS.loi.y * (selectedBot === 'anh' ? 1.25 : 1) * isTeleportSucess;
        if (isTeleportSucess) audio.play("sfx", "loi-teleport");
    } else if (selectedChar === 'tan') {
        // GOD MODE: 2x speed + immortal for 5s
        player.isTanGod = true;
        player.tanGodEnd = now + 5000;
        player.isInvincible = true;
        player.invincibleEnd = now + 5000;
        shakeAmount = 20;
        audio.play("sfx", "tan-sasuke");
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#facc15' : '#fff');
            }, i * 80);
        }
        yCD = now + COOLDOWNS.tan.y * (selectedBot === 'anh' ? 1.25 : 1);
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
        audio.play("sfx", "thoai-mitombokhoradio");
        yCD = now + COOLDOWNS.thoai.y * (selectedBot === 'anh' ? 1.25 : 1);
    } else if (selectedChar === 'quang') {
        // EARTHQUAKE: shake camera, delay bots 3s, then 0.25x speed for 2s
        shakeAmount = 35;
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                shakeAmount = Math.max(shakeAmount, 20);
                spawnShockwave(player.x, player.y, i % 2 ? '#a16207' : '#78350f');
            }, i * 150);
        }
        audio.play("sfx", "quang-stomp");
        bots.forEach(b => {
            b.isDelayed = true;
            b.delayUntil = now + 4500;
            b.quangEarthquakeSlowUntil = now + 4500;
        });
        yCD = now + COOLDOWNS.quang.y * (selectedBot === 'anh' ? 1.25 : 1);
    } else if (selectedChar === 'trung') {
        // CON CỦA THẦN GIÓ: 2x speed + ghost through bots 5s, then tired 0.5x for 1s
        player.isTrungWindGod = true;
        player.trungWindGodEnd = now + 5000;
        player.isGhost = true;
        player.ghostEnd = now + 5000;
        shakeAmount = 25;
        for (let i = 0; i < 12; i++) {
            setTimeout(() => spawnShockwave(player.x, player.y, i % 2 ? '#38bdf8' : '#e0f2fe'), i * 80);
        }
        audio.play("sfx", "trung-thechildofthewindgod");
        setTimeout(() => {
            player.isTrungTired = true;
            player.trungTiredEnd = now + 6000; // 5s wind + 1s tired
            spawnShockwave(player.x, player.y, '#94a3b8');
            if (!MUTE_SFX) playSfx(200, 'sine', 0.3, 0.2, 100);
        }, 5000);
        yCD = now + COOLDOWNS.trung.y * (selectedBot === 'anh' ? 1.25 : 1);
    }
}

function useU() {
    const now = Date.now();
    if (now < uCD || player.isDelayed || player.isTrungTired) return;
    shakeAmount = 10;
    if (selectedChar === 'khang') {
        freezeEnd = now + 4000;
        spawnShockwave(player.x, player.y, 'rgba(255,255,255,0.5)');
        audio.play("sfx", "khang-timestop");
        document.body.classList.add('time-stop');
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
                b.isDelayed = true;
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
                    if (!checkCollision(b.x, b.y)) break;
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
            audio.play("sfx", "dang-punchsucess");
        } else audio.play("sfx", "dang-missing");

    } else if (selectedChar === 'loi') {
        player.isLoiSpeed = true;
        player.loiSpeedEnd = now + 3000;
        audio.play("sfx", "loi-speed");
    } else if (selectedChar === 'tan') {
        // SHARINGAN: screen red, all bots delayed 5s, then 3x rage for 3s after
        player.isTanSharingan = true;
        player.tanSharinganEnd = now + 10000;
        shakeAmount = 30;
        bots.forEach(b => {
            b.isDelayed = true;
            b.delayUntil = now + 5000;
            b.superRageStart = now + 5000;
            b.superRageEnd = now + 10000;
        });
        audio.play("sfx", "tan-sharingan");
        const sharinganImg = document.getElementById('sharingan-flash');
        sharinganImg.classList.remove('hidden');
        sharinganImg.style.opacity = 1;
        setTimeout(() => {
            sharinganImg.style.transition = 'opacity 1s ease-out';
            sharinganImg.style.opacity = 0;
        }, 300);
        setTimeout(() => {
            sharinganImg.classList.add('hidden');
            sharinganImg.style.transition = 'none';
        }, 1600);
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#ef4444' : '#7f1d1d');
                if (!MUTE_SFX) playSfx(80 + i * 30, 'sawtooth', 0.2, 0.25);
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
        audio.play("sfx", "thoai-ragebait");
        // After 2s, Thoai gets 2x speed for 3s
        setTimeout(() => {
            player.isThoaiBoosted = true;
            player.thoaiBoostedEnd = now + 5000;
            spawnShockwave(player.x, player.y, '#22c55e');
            audio.play("sfx", "thoai-ragebaitsucess");
        }, 2000);
    } else if (selectedChar === 'quang') {
        // GRAVITY FIELD: player slowed 0.5x for 2s, bots frozen 5s (gravitational pull effect)
        player.isSuperSlow = true;
        player.superSlowEnd = now + 2000;
        player.isQuangGravity = true;
        player.quangGravityEnd = now + 5000;
        bots.forEach(b => {
            b.isDelayed = true;
            b.delayUntil = now + 5000;
            b.quangGravityUntil = now + 5000;
        });
        // Spawn pulsing purple shockwaves
        for (let i = 0; i < 14; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#7e22ce' : '#c084fc');
                if (i < 6) shakeAmount = Math.max(shakeAmount, 15);
            }, i * 200);
        }
        if (!MUTE_SFX) playSfx(80, 'sine', 0.5, 0.35, 40);
    } else if (selectedChar === 'trung') {
        // HASAGI: wild shockwave push everyone through the maze
        shakeAmount = 35;
        audio.play("sfx", "trung-hasagi");
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
            b.isDelayed = true;
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
    uCD = now + COOLDOWNS[selectedChar].u * (selectedBot === 'anh' ? 1.25 : 1);
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
            if (!MUTE_SFX) playSfx(900, 'sine', 0.1);
        } else iCD = now + COOLDOWNS[selectedChar].i * (selectedBot === 'anh' ? 1.25 : 1)
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
        if (!MUTE_SFX) playSfx(700, 'sine', 0.3);
    } else if (selectedChar === 'dang') {
        player.parryEnd = now + 1250;
        player.invincibleEnd = now + 1250;
        player.isParrying = true;
        player.isInvincible = true;
        audio.play("sfx", "dang-parrying");
        spawnShockwave(player.x, player.y, '#cecece');
    } else if (selectedChar === 'loi') {
        decoys.push({ 
            x: player.x, 
            y: player.y, 
            lifeEnd: now + 15000
        });
        if (!MUTE_SFX) playSfx(700, 'sine', 0.3);
    } else if (selectedChar === 'tan') {
        // THE SECOND: all bots disappear instantly
        if (bots.length > 0) {
            shakeAmount = 25;
            bots.forEach(b => {
                spawnShockwave(b.x, b.y, '#f94316');
                spawnShockwave(b.x, b.y, '#facc15');
            });
            audio.play("sfx", "tan-delete");
            if (!MUTE_SFX) 
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
        audio.play("sfx", "thoai-motcaichettruyenthong");
    } else if (selectedChar === 'quang') {
        audio.play("sfx", "quang-burps");
        bots.forEach(b => {
            const dx = b.x - player.x, dy = b.y - player.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d < 6.7) {
                b.x = Math.max(1, Math.min(COLS - 2, b.x + (dx / d) * 5));
                b.y = Math.max(1, Math.min(ROWS - 2, b.y + (dy / d) * 5));
                b.isSlow = true;
                b.slowEnd = now + 4500;
                b.isDelayed = true;
                b.delayUntil = now + 1500;
            }
        });
        bots.forEach(b => {
            if (checkCollision(b.x, b.y)) {
                let dirs = [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]];
                for (let dist = 0.1; dist < 5; dist += 0.1) {
                    for (let [dx, dy] of dirs) {
                        if (!checkCollision(b.x + dx * dist, b.y + dy * dist)) {
                            b.x += dx * dist;
                            b.y += dy * dist;
                            break;
                        }
                    }
                    if (!checkCollision(b.x, b.y)) break;
                }
            }
        });
        player.isSlow = true;
        player.slowEnd = now + 1000;
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#33d87d' : '#20e820');
                shakeAmount = 50;
            }, i * 60);
        }
    } else if (selectedChar === 'trung') {
        // ATOMIC SLICE: dash like Khang Y, kill all bots surfed past (split effect)
        let dx = keys.a ? -1 : (keys.d ? 1 : 0), dy = keys.w ? -1 : (keys.s ? 1 : 0);
        if (!dx && !dy) dy = -1;
        player.isInvincible = true;
        player.invincibleEnd = now + 750;
        audio.play("sfx", "trung-katanaschwing");
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
                audio.play("sfx", "kill");
                b.isDead = true;
            }
        });
        bots = bots.filter(b => !b.isDead);
    }
    iCD = now + COOLDOWNS[selectedChar].i * (selectedBot === 'anh' ? 1.25 : 1);
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
        audio.play("sfx", "dang-weave");
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                spawnShockwave(player.x, player.y, i % 2 ? '#06b6d4' : '#fff');
            }, i * 120);
        }
    } else if (selectedChar === 'khang') {
        player.isUlt = true;
        player.ultEnd = now + 5000;
        audio.play("sfx", "khang-letsgo");
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
        // BOUNCE BOMB: throw a bouncing object that kills bots on collision for 10s
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.25 + 0.065 * (currentLevel);
        bounceObjects.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifeEnd: now + 10000,
            radius: 0.425 + 0.025 * (currentLevel)
        });
        shakeAmount = 20;
        spawnShockwave(player.x, player.y, '#6366f1');
        audio.play("sfx", "loi-stagger");
        objID = setTimeout(() => {
            audio.play("sfx", "loi-whattheboom");
            setTimeout(() => {
                const box = bounceObjects[0].x,
                      boy = bounceObjects[0].y;
                spawnShockwave(box, boy, '#6366f1');
                spawnShockwave(box, boy, '#000');
                bots.forEach(b => {
                    const dx = box - b.x, dy = boy - b.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 5) {
                        b.isDead = true;
                        audio.play("sfx", "kill");
                    } else if (d < 8) {
                        b.isSlow = true;
                        b.slowEnd = now + 3000;
                    }
                });
                bots = bots.filter(b => !b.isDead);
            }, 2000);
        }, 8000);
    } else if (selectedChar === 'tan') {
        // HUNTER ULT: become hunter — touching bots destroys them, +0.25x speed per kill, lasts 30s
        player.isTanHunter = true;
        player.tanHunterEnd = now + 30000;
        player.tanUltKills = 0;
        player.isInvincible = true;
        player.invincibleEnd = now + 30000;
        shakeAmount = 50;
        audio.play("sfx", "tan-hunter");
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
        audio.play("sfx", "thoai-blackhole");
    } else if (selectedChar === 'quang') {
        // EARTHQUAKE JUMP: jump and destroy 3x3 blocks when landing
        player.isQuangJumping = true;
        player.quangJumpEnd = now + 1500;
        player.isInvincible = true;
        player.invincibleEnd = now + 1700;
        audio.play("sfx", "quang-jump");
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
        shakeAmount = 25;
        audio.play("sfx", "trung-rasengan");
        for (let i = 0; i < 10; i++) {
            setTimeout(() => spawnShockwave(player.x, player.y, i % 2 ? '#38bdf8' : '#7dd3fc'), i * 80);
        }
    }
    oCD = now + COOLDOWNS[selectedChar].o * (selectedBot === 'anh' ? 1.25 : 1);
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
    const rageCycle = 15000 + (selectedBot === 'tin' ? 2500 : 0);
    const rageDuration = 5000 + (selectedBot === 'luom' ? 2500 : 0);
    const isCommonRage = isRageable && elapsed > 10000 && (elapsed % rageCycle) > (rageCycle - rageDuration);
    // BOT Specialty Logic
    // Queen delays the player for 3 seconds
    if (selectedBot === 'quyen' && !player.isDelayed && elapsed > 5000 && (elapsed % (10000 + 1500 * currentLevel)) < 50) {
        player.isDelayed = true;
        player.delayEnd = now + 3000;
        document.getElementById('warning-flash').classList.add('delay-warning');
        audio.play("sfx", `quyen-error${Math.floor(Math.random() * 3) + 1}`);
    }

    if (now > player.delayEnd) {
        player.isDelayed = false;
        document.getElementById('warning-flash').classList.remove('delay-warning');
    }

    // Miss Anh: Red Light Green Light skill (6s green - 1s red)
    if (selectedBot === 'anh') {
        const lightCycleDuration = 8000; // 8 seconds per cycle
        const redLightDuration = 800;     // 0.8 second red light
        
        // Nếu đang bị phạt, tạm dừng chu kỳ đèn cho đến khi hết penalty
        let effectiveElapsed = elapsed;
        if (player.isAnhBlinded && now < player.anhBlindedEnd) {
            // Đặt lại elapsed về thời điểm bắt đầu bị phạt để chu kỳ không tiến triển
            effectiveElapsed = player.anhPenaltyStart;
        }
        
        const cycleTime = effectiveElapsed % lightCycleDuration;
        const isRedLight = cycleTime >= (lightCycleDuration - redLightDuration);
        
        // Determine which stage (1-4) based on cycle progress
        let newPhase = Math.floor(cycleTime / 2000) + 1;
        if (newPhase > 4) newPhase = 4;
        
        // Update light phase
        player.anhLightPhase = newPhase;
        player.anhLightCycle = Math.floor(effectiveElapsed / lightCycleDuration);

        if (player.anhLightPhase != lastAnhState){
            if (lastAnhState != null)
                document.getElementById(`anh-stage${lastAnhState}`).classList.add('hidden');
            lastAnhState = player.anhLightPhase;
            isStateChanged = true;
        }
        
        // Check if red light just started
        if (isRedLight && !player.isAnhRedLight)
            player.isAnhRedLight = true;
        
        // Check if green light started (red light ended)
        if (!isRedLight && player.isAnhRedLight)
            player.isAnhRedLight = false;
        
        // Check if player moved during red light -> penalty
        // Use keys pressed instead of player.isMoving (which is set after this check)
        // Không tính penalty nếu đang bị phạt từ trước
        if (player.isAnhRedLight && player.isMoving && !player.isAnhBlinded) {
            // Player moved during red light - apply blindness and slow
            player.isAnhBlinded = true;
            player.anhBlindedEnd = now + 3000; // 3 seconds blindness
            player.anhPenaltyStart = effectiveElapsed; // Lưu thời điểm bắt đầu bị phạt
            player.isSlow = true;
            player.slowEnd = now + 3000;
            if (!isAnhBreak) isBreakingPlayed = false;
            isAnhBreak = true;
            shakeAmount = 15;
            spawnShockwave(player.x, player.y, '#ef4444');
        }
        
        // Clear blindness when time is up
        if (now > player.anhBlindedEnd) {
            document.getElementById(`anh-breaking`).classList.add('hidden');
            document.getElementById('anh-normal').classList.remove('hidden');
            isAnhBreak = false;
            player.isAnhBlinded = false;
        }
    }
    // Lerm movement
    let isLuomCanMove = false;
    let tick = 550 - (isCommonRage ? 45 : 22.5) * currentLevel;
    if (selectedBot === 'luom' && elapsed > tick && !(player.isQuangGravity && now < player.quangGravityEnd)) {
        const luomDur = (isHard ? 65 : 50) + (isCommonRage ? 7.5 : 5) * currentLevel;
        if ((elapsed % tick) < luomDur && !isLuomCanMove && freezeEnd < now && bots.length > 0)
            isLuomCanMove = true;
    }

    const statusEl = document.getElementById('bot-status');
    if (isCommonRage) {
        statusEl.classList.remove('opacity-0');
        statusEl.innerText = "BOT RAGE! (2X SPEED)";
        statusEl.style.color = '';
        if (!isRaging) {
            audio.play("sfx", `rage${selectedBot !== 'quyen' ? 1 : 2}`);
            isRaging = true;
        }
        playAlarm();
    } else {
        isRaging = false;
        if (selectedChar !== 'quang' && ((player.isSuperSlow && now < player.superSlowEnd) || (player.isSlow && player.slowEnd))) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.color = '#c084fc';
            statusEl.innerText = "🐌 BỊ LÀM CHẬM";
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
            statusEl.style.color = '#f94316';
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
            x: 1.5, y: 1.5, isDelayed: true, delayUntil: now + 500 
                                        + ((selectedBot == 'luom' || selectedBot == 'tin') ? 350 : 0), nextPathUpdate: 0,
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
    if (player.isSuperSlow) mult *= 0.25;
    if (player.isSlow) mult *= 0.525;
    if (selectedChar === 'quang') mult *= 0.85;
    if (player.isParrySuccess) {
        player.isFast = true;
        player.fastEnd = now + 1500;
        player.isParrySuccess = false;
        iCD = Math.max(now, iCD - COOLDOWNS[selectedChar].i * 0.5);
    }
    if (player.isDelayed) mult = 0;
    else if (player.isParrying) mult = 0.015;
    else if (!player.isAnhBlinded) {
        if (player.isFast) mult *= 1.15;
        if (player.isCoffee) mult *= 1.25;
        if (player.isLoiSpeed) mult *= 2;
        if (player.isUlt) mult *= (selectedChar === 'dang' ? 2.65 : 1.75);
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
        let moveX = 0, moveY = 0;
        if (keys.w) moveY = -1;
        if (keys.s) moveY = 1;
        if (keys.a) moveX = -1;
        if (keys.d) moveX = 1;
        
        // Sử dụng hàm movePlayerWithSlide để có cơ chế sát tường và trượt
        if (movePlayerWithSlide(moveX, moveY, pSpd)) {
            player.isMoving = true;
        }
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
            if (d < 1 && !b.trungRasenganHit) {
                b.trungRasenganHit = true;
                b.isDelayed = true;
                b.delayUntil = now + 3000;
                // This bot: 0.25x speed for 15s
                b.trungRasenganSlowUntil = now + 15000;
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
                        ob.x = Math.max(1, Math.min(COLS - 2, ob.x + (oddx / od) * 6));
                        ob.y = Math.max(1, Math.min(ROWS - 2, ob.y + (oddy / od) * 6));
                        ob.trungRasenganSlowOtherUntil = now + 5000;
                    }
                });
                shakeAmount = 25;
                for (let i = 0; i < 10; i++) {
                    setTimeout(() => spawnShockwave(player.trungRasenganX, player.trungRasenganY, i % 2 ? '#38bdf8' : '#ffffff'), i * 50);
                }
                audio.play("sfx", "trung-windhit");
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
    if (selectedBot === 'luom') bSpdBase = (isLuomCanMove ? (isHard ? 1.225 : 1.15) : 0);
    if ((selectedBot === 'quyen' || selectedBot === 'anh') && isHard) bSpdBase *= 1.5;

    bots.forEach(b => {
        if (b.x < 0 || b.x > COLS - 1 || b.y < 0 || b.y > ROWS - 1) {
            b.isDead = true;
            return;
        }
        const superEnraged = (now > b.superRageStart && now < b.superRageEnd) && isRageable;
        let finalBSpd = bSpdBase * timeScale;
        if (superEnraged) finalBSpd *= (selectedBot === 'luom' ? 4.0 : 3.0);
        else if (isCommonRage) finalBSpd *= 2.0;
        if (player.isAnhBlinded) finalBSpd *= 2.0;
        if (b.isSlow) finalBSpd *= 0.35;
        // Thoai [Y]: slow bots
        if (selectedChar === 'thoai' && b.thoaiSlowUntil && now < b.thoaiSlowUntil) finalBSpd *= 0.25;
        // Quang [Y] earthquake slow (0.25x for 2s after 3s delay)
        if (now < b.quangEarthquakeSlowUntil && now >= (b.delayUntil || 0)) finalBSpd *= 0.25;
        // Quang [U] gravity frozen (bots can't move)
        if (b.quangGravityUntil && now < b.quangGravityUntil) finalBSpd = 0;
        if (now >= b.slowEnd) b.isSlow = false;
        // Trung [O] Rasengan: direct hit bot 0.25x for 30s, others 0.5x for 3s
        if (b.trungRasenganSlowUntil && now < b.trungRasenganSlowUntil) finalBSpd *= 0.25;
        if (b.trungRasenganSlowOtherUntil && now < b.trungRasenganSlowOtherUntil) finalBSpd *= 0.5;
        if (isLuomCanMove){
            spawnTrail(b.x, b.y, '#ef4444');
            if (!isLuomMoveAudio) {
                audio.play("sfx", "luom-move");
                isLuomMoveAudio = true;
            }
        } else isLuomMoveAudio = false;
        traps.forEach((t, idx) => {
            if (Math.sqrt((b.x - t.x) ** 2 + (b.y - t.y) ** 2) < 0.7) {
                b.isDelayed = true;
                b.delayUntil = now + (isHard ? 3000 : 3500);
                spawnShockwave(t.x, t.y, '#fff');
                traps.splice(idx, 1);
                audio.play("sfx", "khang-trapcaught");
                b.superEnraged = true;
                b.superRageStart = now + (isHard ? 3000 : 3500);
                b.superRageEnd = now + (isHard ? 3000 : 3500) + 5000;
            }
        });
        decoys.forEach((d, idx) => {
            if (Math.sqrt((b.x - d.x) ** 2 + (b.y - d.y) ** 2) < 0.7)
                d.lifeEnd = d.lifeEnd - (isCommonRage ? 25 : 22.5);
        });
        decoys = decoys.filter(d => now < d.lifeEnd);
        if (now > freezeEnd && now > (b.delayUntil || 0)) {
            b.isDelayed = false;
            let target = (decoys.length > 0) ? decoys[0] : player;
            if (now > b.nextPathUpdate || b.currentPath.length === 0) {
                b.currentPath = getPath(b.x, b.y, target.x, target.y);
                b.nextPathUpdate = now + (isCommonRage ? 100 : 150);
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
        if (Math.sqrt((player.x - b.x) ** 2 + (player.y - b.y) ** 2) < 0.6) {
            if ((selectedChar === 'tan' && player.isTanHunter && now < player.tanHunterEnd) ||
                (selectedChar === 'thoai' && player.isThoaiHunter && now < player.thoaiHunterEnd)) {
                spawnShockwave(b.x, b.y, '#facc15');
                spawnShockwave(b.x, b.y, '#ef4444');
                shakeAmount = 15;
                audio.play("sfx", "kill");
                b.isDead = true;
            } else if (player.isQuangGravity && now < player.quangGravityEnd) {
                b.isDead = true;
                audio.play("sfx", "quang-nom");
            } else if (player.isParrying && now < player.parryEnd) {
                freezeEnd = now + 3000;
                player.isInvincible = true;
                player.isParrying = false;
                player.invincibleEnd = now + 3000;
                player.isParrySuccess = true;
                b.isDelayed = true;
                b.delayUntil = now + 5000;
                // explosion effect + sfx
                if (!MUTE_SFX) playSfx(200, 'sine', 0.2);
                for (let i = 0; i < 10; i++) {
                    spawnShockwave(player.x, player.y, '#ff0000');
                    spawnShockwave(player.x, player.y, '#ffa653');
                    spawnShockwave(player.x, player.y, '#ffffff');
                }
                // rage after stunned
                b.superEnraged = true;
                b.superRageStart = now + 3000;
                b.superRageEnd = now + 7000;
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
                audio.play("sfx", "dang-parrysucess");
            } else if ((freezeEnd < now && !b.isDelayed) && !player.isInvincible && !player.isTanGod && !player.isGhost && !player.isQuangJumping) {
                audio.stopChannel("sfx");
                audio.stopChannel("music");
                audio.play("sfx", "kill");
                audio.play("music", "deaththeme");
                clearTimeout(objID);
                endGame(false, selectedBot);
            }
        }
    });
    let lpbots = bots.length;
    bots = bots.filter(b => !b.isDead);
    if (lpbots > bots.length){
        player.countKills = lpbots - bots.length
        const kmult = (selectedChar === 'quang' ? 0.04 : 0.25) * player.countKills;
        yCD = Math.max(now, yCD - COOLDOWNS[selectedChar].y * kmult);
        uCD = Math.max(now, uCD - COOLDOWNS[selectedChar].u * kmult);
        iCD = Math.max(now, iCD - COOLDOWNS[selectedChar].i * kmult);
        oCD = Math.max(now, oCD - COOLDOWNS[selectedChar].o * kmult);
        player.totalKills += player.countKills;
        player.countKills = 0;
    }
    // BLACK HOLE update (Thoai [O])
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
            if (!MUTE_SFX) playSfx(30, 'sawtooth', 1.0, 0.5, 15);
        }
    });
    blackholes = blackholes.filter(bh => now < bh.lifeEnd && !bh.exploded);
    // BOUNCE OBJECTS update (Loi [O])
    bounceObjects = bounceObjects.filter(bo => now < bo.lifeEnd);
    bounceObjects.forEach(bo => {
        // Move
        bo.x += bo.vx;
        bo.y += bo.vy;
        spawnTrail(bo.x, bo.y, '#6366f1');
        // Bounce off walls
        if (bo.x < 1.5 || bo.x > COLS - 1.5) {
            bo.vx *= -1;
            bo.x = Math.max(1.5, Math.min(COLS - 1.5, bo.x));
        }
        if (bo.y < 1.5 || bo.y > ROWS - 1.5) {
            bo.vy *= -1;
            bo.y = Math.max(1.5, Math.min(ROWS - 1.5, bo.y));
        }
        // Check collision with bots
        bots.forEach(b => {
            const dx = bo.x - b.x, dy = bo.y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bo.radius + 0.5) {
                b.isDead = true;
                for (let i = 0; i < 6; i++) {
                    setTimeout(() => {
                        spawnShockwave(b.x, b.y, '#6366f1');
                        spawnShockwave(b.x, b.y, '#a5b4fc');
                    }, i * 150);
                }
                audio.play("sfx", "loi-explode");
            }
        });
        bots = bots.filter(b => !b.isDead);
        const dx = bo.x - player.x, dy = bo.y - player.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (bo.lifeEnd < now + 8500 && d < bo.radius + 0.45) {
            clearTimeout(objID);
            audio.stop("sfx", "loi-whattheboom");
            audio.play("sfx", "loi-pickup");
            bo.lifeEnd = now;
            oCD = Math.max(now, oCD - COOLDOWNS[selectedChar].o * 0.5);
        }
    });
    blackholes.forEach(bh => {
        bh.radius = Math.min(bh.radius + 0.25, 8);
        bots.forEach(b => {
            const dx = bh.x - b.x, dy = bh.y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 0.4) {
                b.isDead = true;
                spawnShockwave(bh.x, bh.y, '#7c3aed');
                spawnShockwave(bh.x, bh.y, '#000');
                audio.play("sfx", "kill");
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
        bots.forEach(b => {
            const bx = Math.floor(b.x), by = Math.floor(b.y);
            if (Math.abs(bx - px) <= 1.25 && Math.abs(by - py) <= 1.25) {
                b.isDead = true;
                spawnShockwave(b.x, b.y, '#d97706');
                spawnShockwave(b.x, b.y, '#fbbf24');
                shakeAmount = 20;
                audio.play("sfx", "kill");
            }
        });
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
        shakeAmount = 200;
        audio.play("sfx", "quang-landing");
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
        // Force redraw ngay lập tức
        createMazeCache();
        createMazeCacheRage();
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
            bounceObjects = [];
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
                player.ultEnd = now + 3000;
                document.getElementById('trap-counter').innerText = `BẪY CÒN LẠI: 5`;
            }
            if (selectedChar === 'trung' && player.isTrungWindGod && now < player.trungWindGodEnd) 
                player.trungWindGodEnd = now + 4500;
            clearTimeout(objID);
            document.getElementById('ui-level-text').innerText = `LEVEL ${currentLevel}`;
        } else {
            audio.stopChannel("sfx");
            audio.stopChannel("music");
            audio.play("music", "wintheme");
            clearTimeout(objID);
            endGame(true, selectedBot);
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
        if (player.isParrying && !player.isParrySuccess)
            audio.play("sfx", "dang-missing");
        player.isParrying = false;
    }
    if (now > player.fastEnd) player.isFast = false;
    if (now > player.slowEnd) player.isSlow = false;
    if (now > player.superSlowEnd) player.isSuperSlow = false;
    if (now > player.ghostEnd) player.isGhost = false;
    if (now > player.dangCoffeeEnd) player.isCoffee = false;
    if (now > player.invincibleEnd) player.isInvincible = false;
    if (now > player.loiSpeedEnd) player.isLoiSpeed = false;
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
    if (now > player.trungWindGodEnd) { 
        player.isTrungWindGod = false; 
        if (selectedChar === 'trung') player.isGhost = false;
    }
    if (now > player.trungTiredEnd) player.isTrungTired = false;
    if (now > player.trungRasenganEnd) player.isTrungRasengan = false;

    if (player.isUlt) {
        let color = selectedChar === 'dang' ? '#06b6d4' : (selectedChar === 'khang' ? '#fff' : '#6366f1');
        spawnTrail(player.x, player.y, color);
    }
    if (selectedChar === 'loi' && player.isLoiSpeed && now < player.loiSpeedEnd)
        spawnTrail(player.x, player.y, '#6366f1');
    if (selectedChar === 'quang' && player.isQuangJumping && now < player.quangJumpEnd)
        spawnTrail(player.x, player.y, 'rgba(251,191,36,0.7)');
    if (selectedChar === 'quang' && player.isQuangGravity && now < player.quangGravityEnd)
        spawnTrail(player.x, player.y, 'rgba(139,92,246,0.6)');

    updateUI(now);
    draw(isCommonRage & isRageable);
    requestAnimationFrame(update);

    var thisFrameTime = (thisLoop = new Date) - lastLoop;
    frameTime += (thisFrameTime - frameTime) / filterStrength;
    lastLoop = thisLoop;
    if (DEBUG_MODE) {
        const debug = document.getElementById('debug');
        debug.classList.remove('hidden');
        debug.innerText = `X: ${player.x.toFixed(3)} ; Y: ${player.y.toFixed(3)}`
                        + `\nKills: ${player.totalKills}`
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
    const now = Date.now();
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
    const nowDraw = now;
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

    // Draw bounce objects (Loi [O])
    bounceObjects.forEach(bo => {
        const cx = bo.x * TILE_SIZE, cy = bo.y * TILE_SIZE;
        const pulse = 0.8 + 0.2 * Math.sin(nowDraw / 80);
        // Outer glow
        if (ENABLE_SHADOW_EFFECTS) { ctx.shadowBlur = 25; ctx.shadowColor = '#6366f1'; }
        ctx.beginPath();
        ctx.arc(cx, cy, bo.radius * TILE_SIZE * pulse * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,0.3)';
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(cx, cy, bo.radius * TILE_SIZE * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#818cf8';
        ctx.fill();
        // Inner highlight
        ctx.beginPath();
        ctx.arc(cx - TILE_SIZE * 0.1, cy - TILE_SIZE * 0.1, bo.radius * TILE_SIZE * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#c7d2fe';
        ctx.fill();
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
    // PLayer color
    if (selectedChar === 'khang') pCol = '#22c55e';
    else if (selectedChar === 'dang') pCol = '#06b6d4';
    else if (selectedChar === 'loi') pCol = '#6366f1';
    else if (selectedChar === 'thoai') pCol = '#a78bfa'
    else if (selectedChar === 'quang') pCol = '#d97706';
    else if (selectedChar === 'tan') pCol = '#f94316';
    else if (selectedChar === 'trung') pCol = '#38bdf8';

    if (player.isDelayed && now < player.delayEnd) pCol = '#475569';
    if (selectedChar === 'dang' && player.isParrying && now < player.parryEnd) pCol = '#7ec8d5';
    if (selectedChar === 'dang' && player.isGhost && now < player.ghostEnd) pCol = 'rgba(6, 182, 212, 0.5)';
    if (selectedChar === 'tan' && player.isTanGod && now < player.tanGodEnd) pCol = '#facc15';
    if (selectedChar === 'tan' && player.isTanHunter && now < player.tanHunterEnd) pCol = '#ef4444';
    if (selectedChar === 'thoai' && player.isThoaiHunter && now < player.thoaiHunterEnd) pCol = '#facc15';
    if (selectedChar === 'thoai' && player.isThoaiBoosted && now < player.thoaiBoostedEnd) pCol = '#22c55e';
    if (selectedChar === 'thoai' && player.isThoaiPenalty && now < player.thoaiPenaltyEnd) pCol = '#475569';
    if (selectedChar === 'quang' && player.isQuangGravity && now < player.quangGravityEnd) pCol = '#c084fc';
    if (selectedChar === 'quang' && player.isQuangJumping && now < player.quangJumpEnd) pCol = '#fbbf24';
    if (selectedChar === 'trung' && player.isTrungWindGod && now < player.trungWindGodEnd) pCol = '#e0f2fe';
    if (selectedChar === 'trung' && player.isTrungTired && now < player.trungTiredEnd) pCol = '#475569';
    if (selectedChar === 'tan' && player.isTanSharingan && now < player.tanSharinganEnd) {
        // Sharingan: tint the whole canvas red
        ctx.save();
        ctx.fillStyle = 'rgba(180, 0, 0, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    if (selectedChar === 'quang' && player.isQuangGravity && now < player.quangGravityEnd) {
        // Gravity: tint the whole canvas purple
        ctx.save();
        ctx.fillStyle = 'rgba(88, 28, 135, 0.18)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    if (selectedChar === 'trung' && player.isTrungWindGod && now < player.trungWindGodEnd) {
        // Wind God: tint canvas light blue
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    
    // Miss Anh: Red Light Green Light skill - draw stage indicator at top center
    if (selectedBot === 'anh' && gameActive) {
        const lightCycleDuration = 8000;
        const redLightDuration = 800;
        const elapsedDraw = nowDraw - startTime;
        
        // Nếu đang bị phạt, giữ nguyên stage tại thời điểm bị phạt
        let effectiveElapsedDraw = elapsedDraw;
        if (player.isAnhBlinded && nowDraw < player.anhBlindedEnd && player.anhPenaltyStart > 0) {
            effectiveElapsedDraw = player.anhPenaltyStart;
        }
        
        const cycleTime = effectiveElapsedDraw % lightCycleDuration;
        const isRedLight = cycleTime >= (lightCycleDuration - redLightDuration);
        
        // Draw stage indicator at top center
        const stageX = canvas.width / 2;
        const stageY = 40;
        
        // Determine which stage image to use (0-3 for array index)
        const phase = Math.floor(cycleTime / 2000) + 1;
        const stageIndex = phase - 1;
        
        ctx.save();
        
        // Check if player is blinded - use breaking image
        if (player.isAnhBlinded && now < player.anhBlindedEnd) {
            // Draw breaking image at top center
            const imgWidth = 110;
            const imgHeight = 85;
            if (!isBreakingPlayed) {
                isBreakingPlayed = true;
                audio.play("sfx", "anh-breaking");
                document.getElementById(`anh-normal`).classList.add('hidden');
                document.getElementById(`anh-breaking`).classList.remove('hidden');
            }
        } 
        // Otherwise draw stage image
        else if (stageIndex >= 0 && stageIndex < 4) {
            const imgWidth = 110;
            const imgHeight = 85;
            if (isStateChanged) {
                isStateChanged = false;
                audio.play("sfx", `anh-tick${stageIndex+1}`);
                document.getElementById(`anh-stage${stageIndex+1}`).classList.remove('hidden');
            }
        } 
        ctx.restore();
        
        // Draw blindness effect when player is blinded
        if (player.isAnhBlinded && now < player.anhBlindedEnd) {
            ctx.save();
            // Create a vignette effect to simulate blindness
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.6
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add red tint
            ctx.fillStyle = `rgba(239, 68, 68, 0.${player.anhBlindedEnd - now + 1000})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }
    
    drawEntity(player.x, player.y, pCol, player.isDelayed ? 'transparent' : '#454545');

    // Draw Rasengan wind ball
    if (selectedChar === 'trung' && player.isTrungRasengan && now < player.trungRasenganEnd) {
        const rx = player.trungRasenganX * TILE_SIZE;
        const ry = player.trungRasenganY * TILE_SIZE;
        const t2 = now;
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
        if (now < freezeEnd || b.isDelayed) bCol = '#fff';
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
    bounceObjects = [];
    gameActive = false;
    gamePaused = false;
    pauseStart = 0;
    startTime = 0;
    yCD = uCD = iCD = oCD = 0;
    freezeEnd = 0;
    lastBotSpawnTime = 0;
    shakeAmount = 0;
    showRoad = false;
    objID = null;
    alarmSoundPlaying = false;
    isLuomMoveAudio = false;
    lastAnhState = null;
    isStateChanged = false;
    isAnhBreak = false;
    isBreakingPlayed = true;
    player = {
        x: 1.5, y: 1.5,
        isMoving: false, isCoffee: false, isGhost: false, isUlt: false,
        ultEnd: 0, roadEnd: 0, ghostEnd: 0, dangCoffeeEnd: 0,
        khangDashCount: 0, khangTraps: 5,
        isLoiSpeed: false, loiSpeedEnd: 0,
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
        countKills: 0, totalKills: 0,
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
        trungRasenganX: 0, trungRasenganY: 0,
        isAnhBlinded: false, anhBlindedEnd: 0,
        isAnhRedLight: false,
        anhLightPhase: 0,
        anhLightCycle: 0,
        anhPenaltyStart: 0
    };
    for (let i = 1; i < 5; i++)
        document.getElementById(`anh-stage${i}`).classList.add('hidden');
    document.getElementById('anh-breaking').classList.add('hidden');
    document.getElementById('warning-flash').classList.remove('delay-warning');
    document.getElementById('warning-flash').classList.remove('slow-warning');
    document.getElementById('warning-flash').classList.remove('sharingan-warning', 'god-mode-warning', 'hunter-warning');
}

function returnToSelection() {
    audio.stopChannel("music");
    audio.play("music", "mainmenu");
    resetGameState();
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('selection-screen').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    setPauseOverlay(false);
}

// Click to Start handler
function handleClickToStart() {
    document.getElementById('click-to-start').classList.add('hidden');
    document.getElementById('selection-screen').classList.remove('hidden');
    audio.play("music", "mainmenu");
}

function returnToGame() {
    audio.stopChannel("music");
    playChaseTheme()
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
    if (!MUTE_SFX) playSfx(300, 'sine', 0.5, 0.1, 600);
}

window.selectChar = (c) => {
    selectedChar = c;
    const colors = { 
        khang: '#22c55e', 
        dang: '#06b6d4', 
        loi: '#6366f1', 
        tan: '#f94316', 
        thoai: '#a78bfa', 
        quang: '#d97706', 
        trung: '#38bdf8' 
    };
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
    audio.stop("music", "mainmenu");
    playChaseTheme()
    resetGameState();
    document.getElementById('selection-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    currentLevel = 1;
    generateMaze();
    gameActive = true;
    startTime = Date.now();
    update();
    if (!MUTE_SFX) playSfx(300, 'sine', 0.5, 0.1, 600);
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

// Click on canvas to unpause
canvas.addEventListener('click', () => {
    if (gamePaused) {
        togglePause();
    }
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

// Hide selection screen initially, show click-to-start instead
document.getElementById('selection-screen').classList.add('hidden');

// Load settings from file on startup
loadSettings();

/**
 * SETTINGS SYSTEM
 */

// Random theme players
function playChaseTheme() {
    audio.play("music", `${selectedBot}-chase`);
}

function playRandomSettingTheme() {
    const themes = ["settingtheme1", "settingtheme2", "settingtheme3"];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    audio.play("music", randomTheme);
}

function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    playRandomSettingTheme();
    audio.stop("music", "mainmenu");
    loadSettingsToUI();
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
    audio.stopChannel("music");
    audio.play("music", "mainmenu");
}

function loadSettingsToUI() {
    // Load current values to UI
    document.getElementById('setting-fps').value = TARGET_FPS;
    document.getElementById('setting-debug-toggle').checked = DEBUG_MODE;
    document.getElementById('setting-themes-toggle').checked = MUTE_THEMES;
    document.getElementById('setting-sfx-toggle').checked = MUTE_SFX;
    document.getElementById('setting-shadow-toggle').checked = ENABLE_SHADOW_EFFECTS;
    document.getElementById('setting-shockwaves').value = MAX_SHOCKWAVES;
    document.getElementById('setting-trails').value = MAX_TRAILS;
}

function saveSettings() {
    const settings = {
        game: {
            targetFPS: parseInt(document.getElementById('setting-fps').value),
            debugMode: document.getElementById('setting-debug-toggle').checked
        },
        audio: {
            muteThemes: document.getElementById('setting-themes-toggle').checked,
            muteSFX: document.getElementById('setting-sfx-toggle').checked
        },
        visual: {
            enableShadowEffects: document.getElementById('setting-shadow-toggle').checked,
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
}

function applySettings(settings) {
    // Apply game settings
    if (settings.game) {
        TARGET_FPS = settings.game.targetFPS || 60;
        TARGET_FRAME_TIME = 1000 / TARGET_FPS;
        DEBUG_MODE = settings.game.debugMode ?? true;
    }
    // Apply audio settings
    if (settings.audio) {
        MUTE_THEMES = settings.audio.muteThemes ?? false;
        MUTE_SFX = settings.audio.muteSFX ?? false;
        audio.setChannelVolume("sfx", !MUTE_SFX);
        audio.setChannelVolume("music", !MUTE_THEMES);
    }
    
    // Apply visual settings
    if (settings.visual) {
        ENABLE_SHADOW_EFFECTS = settings.visual.enableShadowEffects ?? false;
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
            debugMode: false
        },
        audio: {
            muteThemes: false,
            muteSFX: false
        },
        visual: {
            enableShadowEffects: true,
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
