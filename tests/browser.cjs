const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { chromium } = require('playwright');

// Test-only access to game state lets the suite exercise progression without
// changing production code or relying on the randomly placed enemies.
const hook = `window.testGame={start,update,attack,spell,heal,hurt,draw,
 get player(){return player},get enemies(){return enemies},get depth(){return depth},
 get mode(){return mode},get potions(){return potions},get stairs(){return stairs}};`;

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', 'www'], {
    env: { ...process.env, PYTHONUNBUFFERED: '1' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let browser;
  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('Test server startup timed out')), 10000);
      server.on('error', reject);
      server.on('exit', code => { clearTimeout(timeout); reject(Error(`Test server exited: ${code}`)); });
      server.stdout.on('data', data => {
        const match = data.toString().match(/port (\d+)/);
        if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
      });
    });
    const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(`${response.status()} ${response.url()}`); });
    await page.route('**/game.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(/\}\)\(\);\s*$/, hook + '})();') });
    });
    await page.goto(`http://127.0.0.1:${port}`);
    await page.getByRole('button', { name: /TRÆD IND/ }).click();
    assert.equal(await page.locator('#overlay').isVisible(), false);
    await page.evaluate(() => {
      const g = window.testGame;
      const check = (value, message) => { if (!value) throw Error(message); };
      // Screen-aligned movement is essential after the isometric conversion.
      for (const [key, signX, signY] of [['d', 1, 0], ['a', -1, 0], ['s', 0, 1], ['w', 0, -1]]) {
        g.player.x = 3.5; g.player.y = 3.5;
        const before = DungeonRenderer.iso(g.player.x, g.player.y);
        dispatchEvent(new KeyboardEvent('keydown', { key })); g.update(.05);
        dispatchEvent(new KeyboardEvent('keyup', { key }));
        const after = DungeonRenderer.iso(g.player.x, g.player.y);
        check(signX ? (after.x - before.x) * signX > 0 : Math.abs(after.x - before.x) < .001, 'Screen X direction: ' + key);
        check(signY ? (after.y - before.y) * signY > 0 : Math.abs(after.y - before.y) < .001, 'Screen Y direction: ' + key);
      }
      g.start(); const enemy = g.enemies[0]; enemy.x = g.player.x + 1; enemy.y = g.player.y;
      const hp = enemy.hp; g.attack(); check(enemy.hp < hp, 'Sword damage');
      const mana = g.player.mp; g.spell(); check(g.player.mp === mana - 15, 'Spell mana cost'); g.update(.05); g.draw();
      g.player.hp = 30; g.heal(); check(g.player.hp === 80 && g.potions === 2, 'Potion healing');
      for (let level = 1; level < 3; level++) {
        for (const e of g.enemies) if (e.hp > 0) g.hurt(e, 999);
        g.player.x = g.stairs.x; g.player.y = g.stairs.y; g.update(.01);
        check(g.depth === level + 1, 'Level transition'); g.draw();
      }
      for (const e of g.enemies) if (e.hp > 0) g.hurt(e, 999);
      check(g.mode === 'won', 'Boss victory');
      g.start(); g.player.hp = 1; const e = g.enemies[0]; e.x = g.player.x; e.y = g.player.y; e.cd = 0; g.update(.01);
      check(g.mode === 'dead', 'Player death'); g.start(); check(g.player.hp === 100 && g.mode === 'playing', 'Restart');
    });
    const joy = await page.locator('#joystick').boundingBox();
    const before = await page.evaluate(() => ({ ...testGame.player }));
    await page.mouse.move(joy.x + joy.width / 2, joy.y + joy.height / 2);
    await page.mouse.down();
    await page.mouse.move(joy.x + joy.width - 8, joy.y + joy.height / 2);
    await page.waitForTimeout(180); await page.mouse.up();
    const after = await page.evaluate(() => ({ ...testGame.player }));
    assert(after.x > before.x && after.y < before.y, 'Joystick should move right in screen space');
    await page.getByRole('button', { name: 'Pause spil' }).click();
    const mana = await page.locator('#mp').textContent(); await page.waitForTimeout(200);
    assert.equal(await page.locator('#mp').textContent(), mana, 'Pause freezes simulation');
    // Exercise each viewport and confirm the renderer produces a detailed image,
    // not just a loaded canvas or a black frame.
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 844, height: 390 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(80);
      const result = await page.evaluate(() => {
        const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height), colors = new Set();
        let bright = 0, dark = 0;
        for (let i = 0; i < data.length; i += 4) {
          colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
          const value = data[i] + data[i + 1] + data[i + 2];
          if (value > 180) bright++; if (value < 60) dark++;
        }
        return { colors: colors.size, bright, dark, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert(result.colors > 200 && result.bright > 100 && result.dark > 100, 'Lit architecture, sprites and darkness must all render');
      assert.equal(result.overflow, false, 'No horizontal layout overflow');
    }
    assert.deepEqual(errors, [], 'No browser or asset errors');
    console.log('PASS: isometric movement, joystick, combat, healing, all levels, boss, death/restart, pause, detailed rendering and 4 viewports.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
