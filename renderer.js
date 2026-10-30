'use strict';
// Original, locally rendered pixel art. No remote textures or copied game assets.
window.DungeonRenderer = (() => {
  const TW = 56, TH = 28, WALL = 49;
  const atlas = new Image();
  let atlasFrames = null;
  atlas.src = 'assets/characters.png';
  const ready = Promise.all([
    atlas.decode(),
    fetch('assets/characters.json').then(response => {
      if (!response.ok) throw Error('Character atlas metadata unavailable');
      return response.json();
    })
  ]).then(([, frames]) => { atlasFrames = frames; return true; }).catch(error => {
    console.warn('Using fallback character art:', error.message);
    return false;
  });

  const iso = (x, y) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 });
  const noise = (x, y, seed = 0) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
  const surface = (w, h, paint) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d')); return c;
  };
  function poly(c, points, fill, stroke) {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }
  function diamond(c, x, y, w, h, fill, stroke) {
    poly(c, [[x, y], [x + w / 2, y + h / 2], [x, y + h], [x - w / 2, y + h / 2]], fill, stroke);
  }
  const floors = Array.from({ length: 3 }, (_, level) => Array.from({ length: 12 }, (_, seed) => surface(TW + 2, TH + 2, c => {
    diamond(c, TW / 2 + 1, 1, TW, TH, '#171919');
    // Four beveled flagstones per diamond, with fixed chips and mineral grain.
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const p = iso(x / 2, y / 2), n = noise(x, y, seed), t = 38 + n * 16;
      const color = level === 1 ? rgb(t, t * .99, t * .89) : level === 2 ? rgb(t * .96, t * .86, t * .86) : rgb(t * .92, t, t * 1.04);
      diamond(c, TW / 2 + 1 + p.x, 1 + p.y, TW / 2 - 2, TH / 2 - 1, color, '#171b1c');
      c.fillStyle = '#7e7a6526'; c.fillRect(TW / 2 + p.x - 8, p.y + 7, 5, 1);
    }
    c.save(); diamond(c, TW / 2 + 1, 1, TW - 2, TH - 2); c.clip();
    for (let i = 0; i < 62; i++) {
      const n = noise(i, seed, level); c.fillStyle = n > .6 ? '#aba39216' : '#00000030';
      c.fillRect(noise(i, 1, seed) * TW | 0, noise(i, 2, seed) * TH | 0, 1 + (i % 2), 1);
    }
    if (seed % 3 === 0) {
      c.strokeStyle = '#111717'; c.beginPath(); c.moveTo(19, 7); c.lineTo(23, 10); c.lineTo(21, 12); c.lineTo(29, 16); c.stroke();
    }
    c.restore();
  })));
  const walls = Array.from({ length: 6 }, (_, seed) => surface(TW + 2, WALL + TH + 2, c => {
    const mid = TW / 2 + 1;
    poly(c, [[1, TH / 2], [mid, TH], [mid, TH + WALL], [1, TH / 2 + WALL]], '#272928');
    poly(c, [[mid, TH], [TW + 1, TH / 2], [TW + 1, TH / 2 + WALL], [mid, TH + WALL]], '#343532');
    // Slanted mortar joints wrap both visible faces of each stone wall.
    for (let row = 0; row < 5; row++) {
      for (const side of [-1, 1]) {
        const base = row * 10;
        for (let brick = 0; brick < 3; brick++) {
          let a = brick * 14 - (row % 2) * 7, b = Math.min(28, a + 13); a = Math.max(0, a);
          if (b <= a) continue;
          const tint = noise(brick, row, seed) * 11 + (side === 1 ? 43 : 32);
          const ax = mid + side * a, bx = mid + side * b;
          poly(c, [[ax, TH - a / 2 + base + 1], [bx, TH - b / 2 + base + 1], [bx, TH - b / 2 + base + 9], [ax, TH - a / 2 + base + 9]], rgb(tint, tint + 1, tint - 3));
          c.strokeStyle = side === 1 ? '#77736355' : '#64625444'; c.beginPath();
          c.moveTo(ax, TH - a / 2 + base + 1); c.lineTo(bx, TH - b / 2 + base + 1); c.stroke();
          c.fillStyle = '#141a1855'; c.fillRect((ax + bx) / 2 | 0, TH - (a + b) / 4 + base + 5 | 0, 3, 1);
        }
      }
    }
    if (seed % 3 === 1) for (const side of [-1, 1]) {
      const face = (u, v) => [mid + side * u, TH - u / 2 + v];
      poly(c, [face(6, 39), face(6, 17), face(10, 10), face(14, 6), face(18, 10), face(22, 17), face(22, 39)], '#121b1c', '#777563');
      poly(c, [face(9, 37), face(9, 18), face(14, 11), face(19, 18), face(19, 37)], '#192625', '#363f37');
      c.strokeStyle = '#686956'; c.beginPath(); c.moveTo(...face(14, 14)); c.lineTo(...face(14, 37)); c.moveTo(...face(8, 25)); c.lineTo(...face(20, 25)); c.stroke();
      poly(c, [face(4, 40), face(24, 40), face(24, 43), face(4, 43)], '#77725c', '#2c332c');
    }
    diamond(c, mid, 0, TW, TH, '#55554b', '#777263');
    diamond(c, mid, 3, TW - 10, TH - 6, '#44463f', '#353a34');
    c.fillStyle = '#8e876240'; c.fillRect(20, 10, 8, 1); c.fillStyle = '#11171388'; c.fillRect(mid - 1, 33, 2, 17);
    if (seed % 2 === 0) { c.fillStyle = '#3d493780'; c.fillRect(6, 40, 5, 3); c.fillRect(9, 43, 3, 4); }
  }));
  function sprite(kind, frame, facing) {
    return surface(48, 64, c => {
      const boss = kind === 'boss', hero = kind === 'hero', skeleton = kind === 'skeleton';
      const walk = Math.sin(frame * Math.PI / 2), bob = Math.abs(walk) > .5 ? 1 : 0;
      const r = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y + bob, w, h); };
      c.save(); if (facing < 0) { c.translate(48, 0); c.scale(-1, 1); }
      if (hero) {
        // Split burgundy cloak, articulated plate armor, shield, steel blade.
        poly(c, [[17, 24], [29, 23], [33 + walk, 48], [25, 45], [14 - walk, 48]], '#271b20', '#101215');
        r(17, 27, 11, 18, '#632c31'); r(18, 29, 3, 15, '#8e4140'); r(26, 29, 3, 14, '#3f222a');
        r(18, 42, 5, 12 + walk * 2, '#23272b'); r(26, 42, 5, 12 - walk * 2, '#23272b');
        r(17, 50 + walk * 2, 7, 5, '#11181d'); r(26, 50 - walk * 2, 8, 5, '#11181d');
        r(19, 43, 2, 7, '#75818a'); r(27, 43, 2, 7, '#596976');
        poly(c, [[17, 27 + bob], [25, 23 + bob], [32, 28 + bob], [29, 41 + bob], [19, 41 + bob]], '#4d5e68', '#1b242b');
        r(19, 28, 4, 11, '#879397'); r(23, 28, 3, 11, '#a1a6a0'); r(27, 29, 3, 10, '#344654');
        r(18, 40, 13, 3, '#342720'); r(23, 40, 3, 3, '#bf9855');
        r(14, 26, 8, 5, '#77878e'); r(15, 26, 6, 1, '#bcc1b6');
        r(30, 27, 6, 5, '#75828a'); r(31, 32, 4, 8, '#3f4d57'); r(33, 37, 3, 4, '#c2a58b');
        // Helmet profile with a narrow face opening and nasal guard.
        r(20, 15, 9, 11, '#252e34'); r(20, 15, 7, 3, '#7b8586'); r(19, 18, 11, 5, '#8e9794');
        r(21, 15, 3, 6, '#bec1ad'); r(25, 19, 6, 5, '#b69a80'); r(26, 20, 5, 2, '#171a1d');
        r(27, 19, 2, 5, '#7f8e91'); r(22, 24, 6, 3, '#252c31');
        poly(c, [[11, 32 + bob], [19, 29 + bob], [23, 35 + bob], [20, 45 + bob], [16, 48 + bob], [11, 42 + bob]], '#72604b', '#171a1b');
        poly(c, [[13, 33 + bob], [18, 32 + bob], [21, 36 + bob], [18, 44 + bob], [16, 45 + bob], [13, 40 + bob]], '#354a56', '#a39370');
        r(16, 34, 2, 9, '#c1ad78'); r(13, 37, 7, 2, '#c1ad78');
        poly(c, [[34, 36 + bob], [39, 15 + bob], [41, 12 + bob], [42, 16 + bob], [36, 37 + bob]], '#a4b6ba', '#343f47');
        c.strokeStyle = '#edf0d6'; c.beginPath(); c.moveTo(35, 34 + bob); c.lineTo(41, 15 + bob); c.stroke();
        r(31, 36, 9, 2, '#b89a52'); r(34, 38, 2, 5, '#453326');
      } else if (skeleton) {
        const bone = '#b4af90', shade = '#686c60';
        r(17, 45, 3, 10 + walk * 2, shade); r(27, 44, 3, 11 - walk * 2, shade);
        r(16, 52 + walk * 2, 6, 3, bone); r(27, 52 - walk * 2, 6, 3, bone);
        r(18, 39, 12, 5, shade); r(21, 28, 3, 15, bone); r(17, 29, 14, 2, bone);
        for (let j = 0; j < 3; j++) { r(17 + j, 32 + j * 3, 13 - j * 2, 1, bone); }
        r(14, 30, 3, 10, shade); r(12, 39, 4, 7, bone); r(30, 30, 3, 12, shade);
        r(17, 18, 13, 9, '#696c5c'); r(19, 16, 9, 12, bone); r(20, 27, 7, 2, bone);
        r(19, 20, 3, 4, '#1a2423'); r(25, 20, 3, 4, '#1a2423'); r(20, 21, 1, 1, '#dc9d56'); r(26, 21, 1, 1, '#dc9d56');
        r(23, 24, 2, 2, '#3e433a'); r(20, 26, 1, 2, '#4e5146'); r(24, 26, 1, 2, '#4e5146');
        poly(c, [[32, 39 + bob], [36, 18 + bob], [38, 17 + bob], [35, 40 + bob]], '#878d86', '#343a34');
        r(30, 40, 8, 2, '#736744'); r(33, 42, 2, 4, '#43352a');
      } else {
        const skin = boss ? '#8e4c3f' : '#727866', light = boss ? '#b87959' : '#979a75', dark = boss ? '#452b2d' : '#373f39';
        r(14, 42, 7, 12 + walk * 2, dark); r(27, 42, 7, 12 - walk * 2, dark);
        r(11, 52 + walk * 2, 10, 4, '#292c29'); r(27, 52 - walk * 2, 11, 4, '#292c29');
        poly(c, [[15, 27 + bob], [25, 22 + bob], [34, 29 + bob], [29, 45 + bob], [18, 45 + bob]], skin, dark);
        r(17, 29, 6, 8, light); r(26, 29, 6, 7, light); r(23, 36, 4, 8, dark);
        r(10, 29, 7, 15, skin); r(33, 29, 6, 14, skin); r(9, 42, 8, 5, dark); r(32, 41, 8, 6, dark);
        r(17, 43, 15, 4, '#322a26'); r(21, 44, 7, 8, '#5c3a31'); r(23, 44, 2, 8, '#9a7350');
        r(19, 16, 12, 12, skin); r(21, 15, 8, 4, light); r(19, 21, 5, 3, '#252a24'); r(27, 21, 5, 3, '#252a24');
        r(21, 22, 2, 1, '#efb15a'); r(28, 22, 2, 1, '#efb15a'); r(24, 26, 6, 2, dark);
        r(24, 26, 1, 3, '#d1c3a0'); r(29, 26, 1, 3, '#d1c3a0');
        poly(c, [[19, 20 + bob], [13, 12 + bob], [13, 7 + bob], [16, 12 + bob], [22, 16 + bob]], '#b2a782', dark);
        poly(c, [[29, 17 + bob], [34, 11 + bob], [35, 6 + bob], [37, 13 + bob], [33, 22 + bob]], '#b2a782', dark);
        // Cleaver and iron bracers distinguish the brute silhouette.
        r(10, 37, 7, 4, '#5c6664'); r(33, 36, 6, 4, '#5c6664'); r(37, 31, 2, 19, '#776047');
        poly(c, [[38, 21 + bob], [45, 18 + bob], [46, 30 + bob], [39, 34 + bob]], '#7d8073', '#252e2c');
        if (boss) { r(16, 29, 17, 3, '#312e30'); r(22, 30, 4, 3, '#c1924e'); }
      }
      c.restore();
    });
  }
  const sprites = {};
  for (const kind of ['hero', 'skeleton', 'brute', 'boss']) {
    sprites[kind] = [-1, 1].map(facing => Array.from({ length: 4 }, (_, frame) => sprite(kind, frame, facing)));
  }
  const decor = surface(96, 72, c => {
    // A weathered sarcophagus topped with the relief of a sleeping knight.
    poly(c, [[12, 36], [44, 20], [82, 39], [50, 55]], '#686653', '#222b28');
    poly(c, [[12, 36], [50, 55], [50, 65], [12, 46]], '#393d36', '#202823');
    poly(c, [[50, 55], [82, 39], [82, 49], [50, 65]], '#494d40', '#202823');
    poly(c, [[18, 32], [44, 19], [76, 35], [50, 48]], '#777561', '#3d4339');
    poly(c, [[28, 31], [45, 24], [67, 35], [52, 43]], '#595e50', '#85816a');
    c.fillStyle = '#a19a7a'; c.fillRect(43, 27, 6, 5); c.fillStyle = '#858571'; c.fillRect(43, 32, 12, 6);
    c.strokeStyle = '#b3a680'; c.beginPath(); c.moveTo(39, 33); c.lineTo(60, 42); c.stroke();
    c.fillStyle = '#242b26'; c.fillRect(27, 46, 2, 5); c.fillRect(39, 52, 2, 5); c.fillRect(61, 53, 2, 5);
  });
  let width = 0, height = 0, fog, light, explored = new Set(), lastMap;
  function radial(c, x, y, radius, inside, outside) {
    const g = c.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, inside); g.addColorStop(1, outside);
    c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function draw(canvas, state) {
    const { map, player, enemies, loot, effects, stairs, time, depth, attackCD } = state;
    const w = Math.max(1, Math.round(canvas.clientWidth / 1.4)), h = Math.max(1, Math.round(canvas.clientHeight / 1.4));
    if (w !== width || h !== height) {
      width = w; height = h; canvas.width = w; canvas.height = h;
      fog = surface(w, h, () => {}); light = surface(w, h, () => {});
    }
    if (lastMap !== map) { explored.clear(); lastMap = map; }
    const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
    c.fillStyle = '#080a0b'; c.fillRect(0, 0, w, h);
    const center = iso(player.x, player.y), ox = Math.round(w / 2 - center.x), oy = Math.round(h * .57 - center.y);
    const onScreen = (p, margin = 100) => p.x > -margin && p.x < w + margin && p.y > -margin && p.y < h + margin;
    const screen = (x, y) => { const p = iso(x, y); return { x: p.x + ox, y: p.y + oy }; };
    const lights = [], objects = [], corpses = enemies.filter(e => e.hp <= 0);
    for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) {
      const p = screen(x, y), dist = Math.hypot(x + .5 - player.x, y + .5 - player.y);
      if (dist < 6) explored.add(`${x},${y}`);
      if (!onScreen(p)) continue;
      c.drawImage(floors[depth - 1][(x * 7 + y * 3) % 12], Math.round(p.x - TW / 2 - 1), Math.round(p.y - 1));
      if (map[y][x]) {
        objects.push({ order: x + y + 1, type: 'wall', x, y, p });
        if ((x + y * 3) % 4 === 0 && (x === 0 || y === 0 || (map[y + 1] && !map[y + 1][x]) || !map[y][x + 1])) {
          const tp = screen(x + .5, y + .5); tp.y -= 23;
          lights.push({ x: tp.x, y: tp.y, radius: 68, seed: x * 3 + y, flame: true });
        }
      } else {
        const n = noise(x, y, depth);
        // Scattered bones, chipped stone and patches of moss are fixed per tile.
        if (n > .73) {
          c.fillStyle = '#535144'; c.fillRect(p.x - 9, p.y + 14, 5, 2); c.fillStyle = '#76705a'; c.fillRect(p.x - 8, p.y + 13, 3, 1);
          c.fillStyle = '#363b30'; c.fillRect(p.x + 8, p.y + 9, 6, 2);
        }
        if (n < .12) {
          c.fillStyle = '#25201f'; c.beginPath(); c.ellipse(p.x + 4, p.y + 14, 9, 3, -.3, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#625344'; c.fillRect(p.x + 1, p.y + 12, 3, 2); c.fillRect(p.x - 3, p.y + 14, 6, 1);
        }
        if ((x === 2 && y === 6) || (x === 8 && y === 4) || (x === 14 && y === 11)) {
          objects.push({ order: x + y + 1, type: 'tomb', p: screen(x + .5, y + .5) });
        }
        if (x === 2 && y === 1 || x === 8 && y === 9 || x === 14 && y === 4) {
          objects.push({ order: x + y + 1, type: 'brazier', p: screen(x + .5, y + .5) });
          const bp = screen(x + .5, y + .5); lights.push({ x: bp.x, y: bp.y - 23, radius: 84, flame: true, seed: x });
        }
      }
    }
    // Faded marble floor inlay surrounding the entrance.
    const rune = screen(3.5, 3.5);
    c.save(); c.translate(rune.x, rune.y); c.scale(1, .5); c.strokeStyle = '#8b80603b'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 48, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.fillStyle = '#93826855'; c.fillRect(Math.cos(a) * 44 - 1, Math.sin(a) * 44 - 2, 2, 4); }
    poly(c, [[0, -27], [23, 14], [-23, 14]], null, '#97845f50'); c.restore();
    for (const e of corpses) {
      const p = screen(e.x, e.y); if (!onScreen(p)) continue;
      c.fillStyle = '#491f2080'; c.beginPath(); c.ellipse(p.x, p.y, 14, 6, -.2, 0, Math.PI * 2); c.fill();
      if (atlasFrames) {
        const kind = e.boss ? 'boss' : enemies.indexOf(e) % 2 ? 'brute' : 'skeleton';
        const character = atlasFrames[kind], pose = character.frames[0];
        const [sx, sy, sw, sh] = pose.rect, scale = (e.boss ? 64 : 39) / character.height;
        c.save(); c.translate(p.x, p.y); c.scale(1, .45); c.rotate(-Math.PI / 2); c.globalAlpha = .6;
        c.drawImage(atlas, sx, sy, sw, sh, -sw * scale / 2, -sh * scale / 2, sw * scale, sh * scale); c.restore();
      } else {
        c.fillStyle = '#625b49'; c.fillRect(p.x - 7, p.y - 3, 12, 4); c.fillStyle = '#8d8468'; c.fillRect(p.x + 5, p.y - 4, 5, 4);
        c.fillStyle = '#343c38'; c.fillRect(p.x - 10, p.y + 1, 6, 2);
      }
    }
    const clear = enemies.every(e => e.hp <= 0), sp = screen(stairs.x, stairs.y);
    if (depth < 3 && onScreen(sp)) {
      diamond(c, sp.x, sp.y - 12, 46, 25, '#101618', '#655e49');
      for (let j = 0; j < 6; j++) {
        c.strokeStyle = clear ? '#8f9f88' : '#4f554a'; c.beginPath();
        c.moveTo(sp.x - 20 + j * 2, sp.y + j - 1); c.lineTo(sp.x, sp.y + j + 8); c.lineTo(sp.x + 20 - j * 2, sp.y + j - 1); c.stroke();
      }
      if (clear) lights.push({ x: sp.x, y: sp.y, radius: 72, portal: true });
    }
    for (const l of loot) {
      const p = screen(l.x, l.y); if (!onScreen(p)) continue;
      c.fillStyle = '#05090888'; c.fillRect(p.x - 5, p.y + 1, 10, 3);
      if (l.type === 'potion') {
        c.fillStyle = '#b1a28a'; c.fillRect(p.x - 1, p.y - 8, 3, 3); c.fillStyle = '#7f2535'; c.fillRect(p.x - 3, p.y - 5, 7, 7); c.fillStyle = '#e47b70'; c.fillRect(p.x - 2, p.y - 4, 2, 3);
      } else if (l.type === 'sword') {
        c.strokeStyle = '#a4b5b0'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - 6, p.y + 2); c.lineTo(p.x + 7, p.y - 7); c.stroke(); c.fillStyle = '#b8984d'; c.fillRect(p.x - 5, p.y - 3, 2, 5);
      } else {
        for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#b48d3e' : '#e2bd69'; c.fillRect(p.x - 5 + (i * 3) % 9, p.y - (i % 3) * 2, 3, 2); }
      }
      c.fillStyle = '#f0dba3'; const glint = Math.sin(time * 3 + l.x); if (glint > .85) c.fillRect(p.x, p.y - 9, 1, 3);
    }
    for (const e of enemies) if (e.hp > 0) objects.push({ order: e.x + e.y, type: 'actor', e, p: screen(e.x, e.y) });
    objects.push({ order: player.x + player.y, type: 'actor', e: { ...player, hero: true }, p: screen(player.x, player.y) });
    objects.sort((a, b) => a.order - b.order);
    for (const o of objects) {
      const p = o.p; if (!onScreen(p)) continue;
      if (o.type === 'wall') {
        // Cut away foreground walls close to the hero without changing collision.
        const behind = o.x + o.y + 1 > player.x + player.y;
        const overlap = Math.abs(p.x - w / 2) < 52 && p.y > h * .57 - 4 && p.y - WALL < h * .57 + 20;
        c.globalAlpha = behind && overlap ? .27 : 1;
        c.drawImage(walls[(o.x + o.y * 3) % 6], Math.round(p.x - TW / 2 - 1), Math.round(p.y - WALL)); c.globalAlpha = 1;
      } else if (o.type === 'tomb') {
        c.drawImage(decor, Math.round(p.x - 48), Math.round(p.y - 50));
      } else if (o.type === 'brazier') {
        c.fillStyle = '#111b1b'; c.fillRect(p.x - 5, p.y - 18, 10, 18); c.fillStyle = '#77725d'; c.fillRect(p.x - 3, p.y - 17, 3, 14);
        diamond(c, p.x, p.y - 24, 20, 10, '#7a6849', '#a18b59'); c.fillStyle = '#262c29'; c.fillRect(p.x - 7, p.y - 20, 14, 3);
        c.fillStyle = '#67604c'; c.fillRect(p.x - 7, p.y - 2, 14, 3);
      } else {
        const e = o.e, kind = e.hero ? 'hero' : e.boss ? 'boss' : (enemies.indexOf(e) % 2 ? 'brute' : 'skeleton');
        c.fillStyle = '#00000065'; c.beginPath(); c.ellipse(p.x, p.y + 1, e.boss ? 20 : 11, e.boss ? 7 : 4, 0, 0, Math.PI * 2); c.fill();
        const walk = e.hero ? state.moving : e.moving;
        const frame = walk ? Math.floor(time * 8) % 4 : 0;
        const direction = e.hero ? e.dx - e.dy : e.aggro ? (player.x - e.x) - (player.y - e.y) : 1;
        const image = sprites[kind][direction < 0 ? 0 : 1][frame], size = e.boss ? 1.6 : 1;
        c.save(); c.translate(Math.round(p.x), Math.round(p.y));
        if (e.hero && attackCD > .22) c.rotate((attackCD - .3) * 1.2);
        if (atlasFrames) {
          const character = atlasFrames[kind], pose = character.frames[frame];
          const [sx, sy, sw, sh] = pose.rect;
          const scale = (e.boss ? 77 : 48) / character.height;
          if (direction < 0) c.scale(-1, 1);
          c.drawImage(atlas, sx, sy, sw, sh, -pose.anchor[0] * scale, -pose.anchor[1] * scale, sw * scale, sh * scale);
        } else {
          c.drawImage(image, -24 * size, -55 * size, 48 * size, 64 * size);
        }
        c.restore();
        if (!e.hero && (e.aggro || e.hp < e.max || e.boss)) {
          const bw = e.boss ? 48 : 24, yy = Math.round(p.y - (e.boss ? 80 : 43));
          c.fillStyle = '#111517'; c.fillRect(p.x - bw / 2 - 1, yy - 1, bw + 2, 4);
          c.fillStyle = e.boss ? '#b34e3c' : '#8e4539'; c.fillRect(p.x - bw / 2, yy, bw * e.hp / e.max, 2);
          if (e.boss) { c.fillStyle = '#d4b67e'; c.font = '7px Georgia'; c.textAlign = 'center'; c.fillText('GRAVENS VOGTER', p.x, yy - 5); }
        }
      }
    }
    for (const l of lights) if (l.flame) {
      const flicker = Math.sin(time * 13 + l.seed) * 2;
      c.fillStyle = '#64452c'; c.fillRect(l.x - 2, l.y, 4, 9); c.fillStyle = '#a75425'; c.fillRect(l.x - 4, l.y - 6, 8, 8);
      poly(c, [[l.x - 3, l.y + 2], [l.x - 4, l.y - 5], [l.x - 1, l.y - 11 - flicker], [l.x + 1, l.y - 5], [l.x + 3, l.y - 8], [l.x + 4, l.y + 2]], '#e68c37');
      poly(c, [[l.x - 2, l.y + 2], [l.x, l.y - 6 + flicker], [l.x + 2, l.y + 2]], '#ffdf8a');
      c.fillStyle = '#ffd19a'; c.fillRect(l.x + Math.sin(time * 3 + l.seed) * 3, l.y - 15 - (time * 13 + l.seed) % 12, 1, 1);
    }
    // A cached-size darkness layer with pools of light, then a subtle warm glow.
    const fc = fog.getContext('2d'); fc.globalCompositeOperation = 'source-over'; fc.clearRect(0, 0, w, h); fc.fillStyle = '#020507ee'; fc.fillRect(0, 0, w, h);
    fc.globalCompositeOperation = 'destination-out';
    radial(fc, w / 2, h * .57 - 12, Math.min(220, w * .8), '#000000f0', '#00000000');
    for (const l of lights) {
      // Stair lights have no flame seed. Only torches should flicker; using a
      // missing seed produces a NaN radius and stops the animation loop.
      const flicker = l.flame ? 1 + Math.sin(time * 9 + l.seed) * .025 : 1;
      radial(fc, l.x, l.y, l.radius * flicker, '#000000cb', '#00000000');
    }
    c.drawImage(fog, 0, 0);
    const lc = light.getContext('2d'); lc.clearRect(0, 0, w, h);
    for (const l of lights) radial(lc, l.x, l.y, l.radius * .7, l.portal ? '#8cbca728' : '#e987382c', '#aa440000');
    c.save(); c.globalCompositeOperation = 'screen'; c.drawImage(light, 0, 0); c.restore();
    for (const e of effects) {
      const p = screen(e.x, e.y); c.globalAlpha = Math.min(1, e.t * 5);
      if (e.text) {
        c.font = 'bold 10px Georgia'; c.textAlign = 'center'; c.fillStyle = '#080a0b'; c.fillText(e.text, p.x + 1, p.y - 43 - (.35 - e.t) * 22);
        c.fillStyle = e.color; c.fillText(e.text, p.x, p.y - 44 - (.35 - e.t) * 22);
      } else if (e.fire) {
        const progress = 1 - e.t / .5, radius = progress * TW * 2.8;
        c.save(); c.translate(p.x, p.y); c.scale(1, .5);
        c.strokeStyle = '#923b24'; c.lineWidth = 9 * (1 - progress); c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = '#f4b75f'; c.lineWidth = 3 * (1 - progress); c.stroke();
        for (let j = 0; j < 30; j++) {
          const a = j * 2.399, rr = radius + Math.sin(j * 7) * 6;
          c.fillStyle = j % 3 ? '#ffb553' : '#ffe2a3'; c.fillRect(Math.cos(a) * rr, Math.sin(a) * rr - progress * (j % 7) * 4, 2, 4);
        } c.restore();
      } else {
        const a = Math.atan2((player.dx + player.dy) * .5, player.dx - player.dy), phase = 1 - e.t / .22;
        c.save(); c.translate(p.x, p.y - 17); c.scale(1, .7); c.lineWidth = 2;
        c.strokeStyle = '#f5e5b8'; c.beginPath(); c.arc(0, 0, 25, a - 1.3 + phase, a + .8 + phase); c.stroke();
        c.strokeStyle = '#afbaa880'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 22, a - 1.5 + phase, a + .3 + phase); c.stroke(); c.restore();
      }
    }
    c.globalAlpha = 1;
    // Automap remembers nearby tiles and never marks enemy positions.
    const mx = w - 59, my = 12; c.fillStyle = '#080c0da8'; c.fillRect(mx - 6, my - 6, 60, 49);
    c.strokeStyle = '#8c795e66'; c.strokeRect(mx - 6.5, my - 6.5, 60, 49);
    for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) {
      if (!explored.has(`${x},${y}`)) continue;
      c.fillStyle = map[y][x] ? '#7d7865' : '#333c38'; c.fillRect(mx + x * 2, my + y * 2, 2, 2);
    }
    c.fillStyle = '#e3c58d'; c.fillRect(mx + player.x * 2 - 1, my + player.y * 2 - 1, 3, 3);
  }
  return { draw, iso, ready };
})();
