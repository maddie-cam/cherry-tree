/**
 * Cherry Tree - Side Scrolling Web Game
 * - Collect falling cherry blossoms
 * - Dodge falling branches
 * - Choose girl or boy character on start screen
 * - Keyboard (← →) or Mobile swipe for movement
 */

(function () {
  'use strict';

  // DOM elements
  const gameScreen = document.getElementById('game-screen');
  const canvas = document.getElementById('game-canvas');
  const hud = document.getElementById('hud');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const gameOverEl = document.getElementById('game-over');
  const finalScoreEl = document.getElementById('final-score');
  const restartButton = document.getElementById('restart-button');
  const menuButton = document.getElementById('menu-button');
  // Character selection overlay elements
  const charOverlay = document.getElementById('char-select-overlay');
  const chooseGirlBtn = document.getElementById('select-girl');
  const chooseBoyBtn = document.getElementById('select-boy');
  const startGameBtn = document.getElementById('start-game-btn');
  const girlPreview = document.getElementById('girl-preview');
  const boyPreview = document.getElementById('boy-preview');

  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext('2d');

  // Pixel-art sprites (procedural): build tiny canvases and scale with smoothing off
  function buildSpriteCanvas(grid, palette) {
    const rows = grid.length;
    const cols = grid[0].length;
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const octx = off.getContext('2d');
    const imageData = octx.createImageData(cols, rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = grid[y][x];
        const color = palette[ch] || 'transparent';
        const idx = (y * cols + x) * 4;
        if (color === 'transparent') {
          imageData.data[idx + 0] = 0;
          imageData.data[idx + 1] = 0;
          imageData.data[idx + 2] = 0;
          imageData.data[idx + 3] = 0;
        } else {
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          imageData.data[idx + 0] = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = b;
          imageData.data[idx + 3] = 255;
        }
      }
    }
    octx.putImageData(imageData, 0, 0);
    return off;
  }

  // Palettes
  const paletteCommon = {
    '.': 'transparent',
    'K': '#111111', // black hair / outline
    'S': '#ffd8c2', // skin
    'W': '#ffffff', // white
    'N': '#7a4a2b', // branch wood
    'p': '#ff9bc7', // blossom light pink
    'P': '#ff5fa2', // dress/shirt dark pink
    'Q': '#ffa6cb', // dress/shirt light pink
    'B': '#3f2213', // brown eye outline
    'b': '#8a4a2a', // brown iris mid
    'G': '#0f0f0f', // black shoes
    'H': '#ff85b6', // pink shoes
  };

  // Girl 16x16 pixel sprite
  const girlGrid = [
    '................',
    '......KKKKKK....',
    '....KKKKKKKKKK..',
    '...KKKSSSSKKKK..',
    '...KSSbWSSbWKK..',
    '...KSSSSSSSSK...',
    '....KKKKKKKKK...',
    '....PPPPPPPP....',
    '...PPPPPPPPPP...',
    '...PPQQPPQQPP...',
    '....PPPPPPPP....',
    '.....PPPPPP.....',
    '.....SS..SS.....',
    '.....WW..WW.....',
    '.....HH..HH.....',
    '................',
  ];

  // Boy 16x16 pixel sprite
  const boyGrid = [
    '................',
    '.....KKKKKKK....',
    '...KKKKKKKKKK...',
    '...KKKSSSSKKK...',
    '...KSSbWSSbWK..',
    '...KSSSSSSSSK..',
    '....KKKKKKKK...',
    '....PPPPPPPP...',
    '....PPPPPPPP...',
    '....QQQQQQQQ...',
    '.....SS..SS....',
    '.....WW..WW....',
    '.....GG..GG....',
    '................',
    '................',
    '................',
  ];

  // Blossom 8x8
  const blossomGrid = [
    '........',
    '..pppp..',
    '.pppppp.',
    '.ppWWpp.',
    '.pppppp.',
    '..pppp..',
    '........',
    '........',
  ];

  // Branch 16x4
  const branchGrid = [
    'NNNNNNNNNNNNNNNN',
    'NNNNNNNNNNNNNNNN',
    'NNNNNNNNNNNNNNNN',
    'NNNNNNNNNNNNNNNN',
  ];

  let girlSprite = buildSpriteCanvas(girlGrid, paletteCommon);
  let boySprite = buildSpriteCanvas(boyGrid, paletteCommon);
  let blossomSprite = buildSpriteCanvas(blossomGrid, paletteCommon);
  let branchSprite = buildSpriteCanvas(branchGrid, paletteCommon);

  // Load optional external sprites from assets if present (64x64 PNG recommended)
  function tryLoadExternalSprite(path, onReady) {
    const img = new Image();
    img.onload = () => onReady(img);
    img.onerror = () => {};
    img.src = path;
  }
  // If `/assets/sprites/girl.png` exists, use it. Same for boy.
  tryLoadExternalSprite('./assets/sprites/girl.png', (img) => {
    // Normalize to 100x150 to match requested 1:1.5 aspect and higher resolution
    const off = document.createElement('canvas');
    off.width = 100; off.height = 150;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(off.width / iw, off.height / ih);
    const dw = Math.floor(iw * scale);
    const dh = Math.floor(ih * scale);
    const dx = Math.floor((off.width - dw) / 2);
    const dy = Math.floor((off.height - dh) / 2);
    octx.clearRect(0,0,off.width,off.height);
    octx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
    girlSprite = off;
    if (typeof renderPreviews === 'function') renderPreviews();
  });
  tryLoadExternalSprite('./assets/sprites/boy.png', (img) => {
    const off = document.createElement('canvas');
    off.width = 100; off.height = 150;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(off.width / iw, off.height / ih);
    const dw = Math.floor(iw * scale);
    const dh = Math.floor(ih * scale);
    const dx = Math.floor((off.width - dw) / 2);
    const dy = Math.floor((off.height - dh) / 2);
    octx.clearRect(0,0,off.width,off.height);
    octx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
    boySprite = off;
    if (typeof renderPreviews === 'function') renderPreviews();
  });

  // Optional PNG sprites for blossom and branch
  tryLoadExternalSprite('./assets/sprites/blossom.png', (img) => {
    blossomSprite = img; // draw directly; we scale with integer multiples for crisp pixels
  });
  tryLoadExternalSprite('./assets/sprites/branch.png', (img) => {
    branchSprite = img;
  });

  // Optional still PNG background support
  let backgroundImage = null;
  let backgroundImageReady = false;
  (function tryLoadBackground() {
    const img = new Image();
    img.onload = () => {
      backgroundImage = img; backgroundImageReady = true;
      if (gameState === 'menu') {
        resizeCanvasToFit();
        drawBackground(ctx, performance.now());
      }
    };
    img.onerror = () => {};
    img.src = './assets/background.png'; // place your file here
  })();

  // Game state
  let selectedCharacter = null; // 'girl' | 'boy'
  let gameState = 'menu'; // 'menu' | 'playing' | 'over'
  let score = 0;
  let lives = 3;
  let lastTimestamp = 0;
  let accumulatedTime = 0;
  let backgroundOffset = 0;
  const fixedDelta = 1000 / 60; // 60 FPS fixed update

  // Dimensions and scaling
  const baseWidth = 480;
  const baseHeight = 720;
  const MAX_BLOSSOMS = 4;
  const MIN_BRANCHES = 2;
  const MAX_BRANCHES = 4;

  function resizeCanvasToFit() {
    // Keep 2:3-ish portrait ratio, fit width
    const container = gameScreen;
    const cssWidth = container.clientWidth;
    const ratio = baseHeight / baseWidth; // 1.5
    const cssHeight = cssWidth * ratio;
    canvas.width = Math.round(cssWidth * devicePixelRatio);
    canvas.height = Math.round(cssHeight * devicePixelRatio);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  window.addEventListener('resize', () => {
    resizeCanvasToFit();
    if (gameState === 'menu') {
      drawBackground(ctx, performance.now());
    }
    if (typeof renderPreviews === 'function') renderPreviews();
  });

  // Player
  const player = {
    x: baseWidth / 2,
    y: baseHeight * 0.95,
    width: 44,
    height: 64,
    speed: 260, // px/s
    targetDirection: 0, // -1 left, 1 right, 0 idle
  };

  // Input handling
  const inputState = {
    left: false,
    right: false,
    // swipe impulse: -1 left, 1 right, 0 none; time remaining in ms
    swipeDirection: 0,
    swipeTimeRemaining: 0,
  };

  function onKeyDown(e) {
    if (e.key === 'ArrowLeft') inputState.left = true;
    if (e.key === 'ArrowRight') inputState.right = true;
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowLeft') inputState.left = false;
    if (e.key === 'ArrowRight') inputState.right = false;
  }

  // Touch swipe
  let touchStartX = null;
  let touchActive = false;
  function onTouchStart(ev) {
    if (ev.touches && ev.touches.length > 0) {
      touchStartX = ev.touches[0].clientX;
      touchActive = true;
    }
  }
  function onTouchMove(ev) {
    if (!touchActive || touchStartX == null) return;
    const currentX = ev.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    const threshold = 30; // px
    if (Math.abs(deltaX) > threshold) {
      inputState.swipeDirection = deltaX > 0 ? 1 : -1;
      inputState.swipeTimeRemaining = 220; // ms impulse
      touchStartX = currentX; // allow chained swipes
    }
  }
  function onTouchEnd() {
    touchActive = false;
    touchStartX = null;
  }

  // Entities
  /** @type {{x:number,y:number,vy:number,drift:number,r:number}[]} */
  const blossoms = [];
  /** @type {{x:number,y:number,vy:number,w:number,h:number}[]} */
  const branches = [];

  let blossomSpawnTimer = 0;
  let branchSpawnTimer = 0;

  // Utility
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Drawing helpers
  function drawBackground(ctx, t) {
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    // If external background is present, draw it scaled to cover
    if (backgroundImageReady && backgroundImage) {
      const iw = backgroundImage.width;
      const ih = backgroundImage.height;
      const scale = Math.max(w / iw, h / ih);
      const dw = Math.ceil(iw * scale);
      const dh = Math.ceil(ih * scale);
      const dx = Math.floor((w - dw) / 2);
      const dy = Math.floor((h - dh) / 2);
      // Use smoothing for photographic background
      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(backgroundImage, dx, dy, dw, dh);
      ctx.imageSmoothingEnabled = prev;
      return;
    }
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#bfe9ff');
    sky.addColorStop(1, '#a7dbff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Parallax distant hills
    ctx.fillStyle = '#a0d1ff';
    for (let i = 0; i < 2; i++) {
      const offset = (backgroundOffset * 0.15 + i * 200) % (w + 200) - 200;
      drawHill(ctx, offset, h * 0.78, w * 0.7, 60);
    }

    // Cherry trees row (parallax)
    const spacing = 160;
    const offsetTrees = backgroundOffset * 0.35;
    for (let x = -200; x < w + 200; x += spacing) {
      const px = (x - (offsetTrees % spacing));
      drawCherryTree(ctx, px, h * 0.66, 1);
    }

    // Ground
    ctx.fillStyle = '#5fd362';
    ctx.fillRect(0, h * 0.8, w, h * 0.2);

    // Blossom flurries (ambient)
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 40; i++) {
      const bx = (i * 97 + (t * 0.05) + backgroundOffset * 0.6) % (w + 40) - 20;
      const by = (i * 53 + (t * 0.1)) % (h * 0.8);
      drawPetal(ctx, bx, by, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawHill(ctx, x, y, width, height) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + width * 0.5, y - height, x + width, y);
    ctx.closePath();
    ctx.fill();
  }

  function drawCherryTree(ctx, x, baseY, scale) {
    // Trunk
    ctx.fillStyle = '#8b5a3c';
    ctx.fillRect(x + 36 * scale, baseY - 40 * scale, 8 * scale, 40 * scale);
    // Canopy
    const pink = ['#ffc1dc', '#ff9bc7', '#ff7fb8'];
    for (let i = 0; i < 7; i++) {
      const r = 22 + Math.sin(i * 1.4) * 6;
      ctx.fillStyle = pink[i % pink.length];
      ctx.beginPath();
      ctx.arc(x + (i * 10), baseY - 50 - (i % 2) * 6, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPetal(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((x + y) * 0.01);
    ctx.fillStyle = '#ff9bc7';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5;
      ctx.quadraticCurveTo(
        Math.cos(a) * r,
        Math.sin(a) * r,
        Math.cos(a + 0.5) * r * 0.6,
        Math.sin(a + 0.5) * r * 0.6
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBranch(ctx, x, y, w, h) {
    ctx.fillStyle = '#7a4a2b';
    ctx.fillRect(x, y, w, h);
    // simple twigs
    ctx.fillRect(x + w * 0.2, y + h * 0.2, 6, -12);
    ctx.fillRect(x + w * 0.7, y + h * 0.5, 6, -14);
  }

  function drawPlayer(ctx) {
    const px = player.x - player.width / 2;
    const py = player.y - player.height;
    // Legs
    ctx.fillStyle = '#222';
    ctx.fillRect(px + player.width * 0.18, py + player.height - 18, 10, 18);
    ctx.fillRect(px + player.width * 0.58, py + player.height - 18, 10, 18);
    // Body
    const bodyColor = selectedCharacter === 'girl' ? '#ff5fa2' : '#e43f30';
    ctx.fillStyle = bodyColor;
    ctx.fillRect(px + 6, py + 18, player.width - 12, player.height - 36);
    // Head
    ctx.fillStyle = '#ffd8c2';
    ctx.beginPath();
    ctx.arc(px + player.width / 2, py + 14, 14, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(px + player.width / 2, py + 10, 16, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px + 16, py + 10, 16, 10);
  }

  // Game flow
  function resetGameState() {
    score = 0;
    lives = 3;
    blossoms.length = 0;
    branches.length = 0;
    blossomSpawnTimer = 0;
    branchSpawnTimer = 0;
    player.x = baseWidth / 2;
    player.y = baseHeight * 0.9;
    lastTimestamp = 0;
    accumulatedTime = 0;
    backgroundOffset = 0;
    // Seed initial objects to requested concurrency
    for (let i = 0; i < MAX_BLOSSOMS; i++) {
      blossoms.push({
        x: 20 + Math.random() * (baseWidth - 40),
        y: -10 - i * 60,
        vy: 60 + Math.random() * 60,
        drift: (Math.random() - 0.5) * 40,
        r: 6 + Math.random() * 6,
      });
    }
    for (let i = 0; i < MIN_BRANCHES; i++) {
      const w = 60 + Math.random() * 60;
      const h = 14 + Math.random() * 12;
      branches.push({
        x: 20 + Math.random() * (baseWidth - 40 - w),
        y: -h - i * 120,
        vy: 120 + Math.random() * 80,
        w,
        h,
      });
    }
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = `SCORE: ${score}`;
    // Pixel hearts: build with a small canvas sprite to get a retro look
    const heart = buildPixelHeart();
    const emptyHeart = buildPixelHeart(true);
    // Render hearts row into livesEl as images
    livesEl.innerHTML = '';
    for (let i = 0; i < lives; i++) {
      const img = document.createElement('img');
      img.src = heart;
      img.width = 16; img.height = 16;
      img.style.imageRendering = 'pixelated';
      img.style.marginRight = '4px';
      livesEl.appendChild(img);
    }
    for (let i = lives; i < 3; i++) {
      const img = document.createElement('img');
      img.src = emptyHeart;
      img.width = 16; img.height = 16;
      img.style.imageRendering = 'pixelated';
      img.style.marginRight = '4px';
      livesEl.appendChild(img);
    }
  }

  function buildPixelHeart(outlineOnly = false) {
    // 8x8 pixel heart grid
    const grid = [
      '..RR..RR',
      '.RRRRRR.',
      'RRRRRRRR',
      'RRRRRRRR',
      '.RRRRRR.',
      '..RRRR..',
      '...RR...',
      '....R...',
    ];
    const off = document.createElement('canvas');
    off.width = 8; off.height = 8;
    const octx = off.getContext('2d');
    const img = octx.createImageData(8,8);
    function set(x,y,hex,alpha=255){
      const i=(y*8+x)*4; img.data[i+0]=parseInt(hex.slice(1,3),16); img.data[i+1]=parseInt(hex.slice(3,5),16); img.data[i+2]=parseInt(hex.slice(5,7),16); img.data[i+3]=alpha; }
    for(let y=0;y<8;y++){
      for(let x=0;x<8;x++){
        const c=grid[y][x];
        if(c==='R'){
          if(outlineOnly){
            // draw outline by checking neighbors
            const neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
            let edge=false;
            for(const [dx,dy] of neighbors){
              const nx=x+dx, ny=y+dy;
              if(nx<0||ny<0||nx>=8||ny>=8||grid[ny][nx]!== 'R'){ edge=true; break; }
            }
            if(edge) set(x,y,'#ff5577'); else set(x,y,'#000000',0);
          } else {
            set(x,y,'#ff5577');
          }
        } else {
          set(x,y,'#000000',0);
        }
      }
    }
    octx.putImageData(img,0,0);
    return off.toDataURL();
  }

  function startGame() {
    if (!selectedCharacter) return;
    gameState = 'playing';
    charOverlay.hidden = true;
    hud.hidden = false;
    gameOverEl.hidden = true;
    resizeCanvasToFit();
    resetGameState();
    attachGameInput();
    requestAnimationFrame(gameLoop);
  }

  function gameOver() {
    gameState = 'over';
    finalScoreEl.textContent = `Score: ${score}`;
    gameOverEl.hidden = false;
    detachGameInput();
  }

  function returnToMenu() {
    gameState = 'menu';
    charOverlay.hidden = false;
    hud.hidden = true;
  }

  // Input attach/detach for game phase
  function attachGameInput() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
  }
  function detachGameInput() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  }

  // Update & render
  function update(dt) {
    // Background scroll
    backgroundOffset += (40 + score * 0.02) * (dt / 1000);

    // Input → target direction
    let direction = 0;
    if (inputState.left && !inputState.right) direction = -1;
    if (inputState.right && !inputState.left) direction = 1;
    if (inputState.swipeTimeRemaining > 0 && direction === 0) {
      direction = inputState.swipeDirection;
      inputState.swipeTimeRemaining -= dt;
      if (inputState.swipeTimeRemaining <= 0) inputState.swipeDirection = 0;
    }
    player.targetDirection = direction;

    // Move player
    player.x += player.speed * player.targetDirection * (dt / 1000);
    const leftBound = 20;
    const rightBound = baseWidth - 20;
    player.x = clamp(player.x, leftBound, rightBound);

    // Spawn blossoms (cap to MAX_BLOSSOMS)
    blossomSpawnTimer -= dt;
    const blossomInterval = Math.max(220, 600 - score * 2);
    if (blossomSpawnTimer <= 0 && blossoms.length < MAX_BLOSSOMS) {
      blossomSpawnTimer = blossomInterval;
      blossoms.push({
        x: 20 + Math.random() * (baseWidth - 40),
        y: -10,
        vy: 60 + Math.random() * 60,
        drift: (Math.random() - 0.5) * 40,
        r: 6 + Math.random() * 6,
      });
    }

    // Spawn branches (keep between MIN_BRANCHES and MAX_BRANCHES)
    branchSpawnTimer -= dt;
    const branchInterval = Math.max(650, 1400 - score * 3);
    if (branches.length < MIN_BRANCHES) {
      branchSpawnTimer = 0; // accelerate until minimum maintained
    }
    if (branchSpawnTimer <= 0 && branches.length < MAX_BRANCHES) {
      branchSpawnTimer = branchInterval;
      const w = 40 + Math.random() * 70;
      const h = 14 + Math.random() * 12;
      branches.push({
        x: 20 + Math.random() * (baseWidth - 40 - w),
        y: -h,
        vy: 120 + Math.random() * 80,
        w,
        h,
      });
    }

    // Update blossoms
    for (let i = blossoms.length - 1; i >= 0; i--) {
      const b = blossoms[i];
      b.y += b.vy * (dt / 1000);
      b.x += b.drift * (dt / 1000);
      // collect?
      if (rectsOverlap(
        player.x - player.width / 2,
        player.y - player.height,
        player.width,
        player.height,
        b.x - b.r,
        b.y - b.r,
        b.r * 2,
        b.r * 2
      )) {
        score += 10;
        updateHud();
        blossoms.splice(i, 1);
        continue;
      }
      if (b.y > baseHeight + 20) blossoms.splice(i, 1);
    }

    // Update branches
    for (let i = branches.length - 1; i >= 0; i--) {
      const br = branches[i];
      br.y += br.vy * (dt / 1000);
      if (rectsOverlap(
        player.x - player.width / 2,
        player.y - player.height,
        player.width,
        player.height,
        br.x,
        br.y,
        br.w,
        br.h
      )) {
        branches.splice(i, 1);
        lives -= 1;
        updateHud();
        if (lives <= 0) {
          gameOver();
          return;
        }
        continue;
      }
      if (br.y > baseHeight + 20) branches.splice(i, 1);
    }
  }

  function render(timestamp) {
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    drawBackground(ctx, timestamp);

    // Entities
    // Blossoms (pixel art, no smoothing)
    ctx.imageSmoothingEnabled = false;
    for (const b of blossoms) {
      const sx = b.x / baseWidth * w;
      const sy = b.y / baseHeight * h;
      const sprW = blossomSprite.width || 8;
      const sprH = blossomSprite.height || 8;
      const desiredW = (b.r * 2) * (w / baseWidth);
      const scale = Math.max(1, Math.round(desiredW / sprW));
      const dw = sprW * scale;
      const dh = sprH * scale;
      ctx.drawImage(blossomSprite, Math.round(sx - dw / 2), Math.round(sy - dh / 2), dw, dh);
    }
    // Branches
    ctx.save();
    for (const br of branches) {
      const x = br.x / baseWidth * w;
      const y = br.y / baseHeight * h;
      const sprW = branchSprite.width || 16;
      const sprH = branchSprite.height || 4;
      const desiredW = (br.w / baseWidth) * w;
      const scale = Math.max(1, Math.round(desiredW / sprW));
      const bw = sprW * scale;
      const bh = sprH * scale;
      ctx.drawImage(branchSprite, Math.round(x), Math.round(y), bw, bh);
    }
    ctx.restore();

    // Player
    ctx.save();
    const px = player.x / baseWidth * w;
    // Align bottom of the sprite to 5% above the bottom of the screen
    const bottomTarget = h * 0.95;
    // Render external sprites at 100x150 base pixels, integer scaled for crisp pixels
    const sprW = (selectedCharacter === 'girl' ? girlSprite : boySprite).width || 100;
    const sprH = (selectedCharacter === 'girl' ? girlSprite : boySprite).height || 150;
    const targetLogicalWidth = 80 / baseWidth * w; // increase on-screen size a bit
    const scale = Math.max(1, Math.round(targetLogicalWidth / sprW));
    const pw = sprW * scale;
    const ph = sprH * scale;
    const spriteCanvas = selectedCharacter === 'girl' ? girlSprite : boySprite;
    const drawY = bottomTarget - ph;
    ctx.drawImage(spriteCanvas, Math.round(px - pw / 2), Math.round(drawY), pw, ph);
    ctx.restore();
  }

  function gameLoop(timestamp) {
    if (gameState !== 'playing') return;
    if (!lastTimestamp) lastTimestamp = timestamp;
    let frameTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    accumulatedTime += frameTime;

    // Fixed time step updates
    while (accumulatedTime >= fixedDelta) {
      update(fixedDelta);
      accumulatedTime -= fixedDelta;
    }
    render(timestamp);
    requestAnimationFrame(gameLoop);
  }

  // Character selection overlay interactions
  function selectCharacter(kind) {
    selectedCharacter = kind;
    if (chooseGirlBtn) {
      chooseGirlBtn.classList.toggle('selected', kind === 'girl');
      chooseGirlBtn.setAttribute('aria-pressed', String(kind === 'girl'));
    }
    if (chooseBoyBtn) {
      chooseBoyBtn.classList.toggle('selected', kind === 'boy');
      chooseBoyBtn.setAttribute('aria-pressed', String(kind === 'boy'));
    }
    if (startGameBtn) startGameBtn.hidden = false;
  }

  if (chooseGirlBtn) chooseGirlBtn.addEventListener('click', () => selectCharacter('girl'));
  if (chooseBoyBtn) chooseBoyBtn.addEventListener('click', () => selectCharacter('boy'));
  if (startGameBtn) startGameBtn.addEventListener('click', startGame);
  restartButton.addEventListener('click', () => {
    gameOverEl.hidden = true;
    startGame();
  });
  menuButton.addEventListener('click', () => {
    gameOverEl.hidden = true;
    returnToMenu();
  });

  // Accessibility: keyboard selection on menu
  function onMenuKeyDown(e) {
    if (gameState !== 'menu') return;
    if (e.key === 'ArrowLeft') selectCharacter('girl');
    if (e.key === 'ArrowRight') selectCharacter('boy');
    if (e.key === 'Enter' && selectedCharacter) startGame();
  }
  window.addEventListener('keydown', onMenuKeyDown);

  // Prevent iOS scrolling while swiping on canvas
  ['touchmove', 'touchstart'].forEach(type => {
    canvas.addEventListener(type, function (e) {
      if (gameState === 'playing') e.preventDefault();
    }, { passive: false });
  });

  // Render small previews of sprites in selection boxes (use external sprites if present)
  function renderPreviews() {
    const targets = [
      { canvas: girlPreview, sprite: girlSprite },
      { canvas: boyPreview, sprite: boySprite },
    ];
    for (const { canvas, sprite } of targets) {
      if (!canvas || !sprite) continue;
      const ctxp = canvas.getContext('2d');
      ctxp.imageSmoothingEnabled = false;
      ctxp.clearRect(0, 0, canvas.width, canvas.height);
      const sprW = sprite.width;
      const sprH = sprite.height;
      const scale = Math.floor(Math.min(canvas.width / sprW, canvas.height / sprH));
      const dw = sprW * scale;
      const dh = sprH * scale;
      const dx = Math.floor((canvas.width - dw) / 2);
      const dy = Math.floor((canvas.height - dh) / 2);
      ctxp.drawImage(sprite, dx, dy, dw, dh);
    }
  }

  // Initial menu state
  (function initMenu() {
    if (charOverlay) charOverlay.hidden = false;
    if (hud) hud.hidden = true;
    if (gameOverEl) gameOverEl.hidden = true;
    resizeCanvasToFit();
    // Draw the background immediately (will show image if loaded; otherwise gradient until load)
    drawBackground(ctx, performance.now());
    renderPreviews();
  })();
})();


