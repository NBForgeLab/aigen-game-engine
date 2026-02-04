import { SceneObject, Asset } from '../store/useGameStore'

export function exportToHtml(project: any, assets: Asset[], sceneObjects: SceneObject[], returnString: boolean = false) {
  const assetsJson = JSON.stringify(assets)
  const sceneObjectsJson = JSON.stringify(sceneObjects)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/8.0.0/pixi.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            overflow: hidden; 
            background: #1a1a1e;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        canvas { 
            display: block;
            max-width: 100%;
            max-height: 100vh;
        }
        #loading {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #1a1a1e;
            color: white;
            font-family: system-ui, sans-serif;
            gap: 16px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #333;
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="loading">
        <div class="spinner"></div>
        <p>Loading ${project.name}...</p>
    </div>
    
    <script type="module">
        const assets = ${assetsJson};
        const sceneObjects = ${sceneObjectsJson};
        
        // Keyboard state
        window.keys = {};
        document.addEventListener('keydown', (e) => window.keys[e.key] = true);
        document.addEventListener('keyup', (e) => window.keys[e.key] = false);
        
        // Initialize PixiJS
        const app = new PIXI.Application();
        
        await app.init({
            width: 800,
            height: 600,
            backgroundColor: 0x1a1a1e,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });
        
        document.body.appendChild(app.canvas);
        document.getElementById('loading').remove();
        
        // Load textures
        const textures = {};
        
        for (const asset of assets) {
            if (asset.type === 'image') {
                try {
                    textures[asset.id] = await PIXI.Assets.load(asset.url);
                } catch (e) {
                    console.warn('Failed to load texture:', asset.name);
                }
            }
        }
        
        // Create sprites
        const sprites = {};
        const objectData = {};
        
        for (const obj of sceneObjects) {
            if (!obj.isVisible) continue;
            
            let sprite;
            
            if (obj.type === 'image' && obj.assetId && textures[obj.assetId]) {
                sprite = new PIXI.Sprite(textures[obj.assetId]);
            } else {
                // Create rectangle placeholder
                const graphics = new PIXI.Graphics();
                graphics.fill({ color: 0x3f3f46 });
                graphics.rect(0, 0, obj.width, obj.height);
                graphics.fill();
                sprite = graphics;
            }
            
            sprite.x = obj.x;
            sprite.y = obj.y;
            sprite.width = obj.width;
            sprite.height = obj.height;
            sprite.rotation = (obj.rotation * Math.PI) / 180;
            sprite.alpha = obj.opacity;
            sprite.zIndex = obj.zIndex;
            
            app.stage.addChild(sprite);
            sprites[obj.id] = sprite;
            objectData[obj.id] = { ...obj };
        }
        
        app.stage.sortChildren();
        
        // Compile logic functions
        const logicFunctions = {};
        
        for (const obj of sceneObjects) {
            if (obj.logic && obj.logic.trim()) {
                try {
                    logicFunctions[obj.id] = new Function(
                        'obj', 'sprite', 'app', 'time', 'keys', 'sprites', 'objectData',
                        obj.logic
                    );
                } catch (e) {
                    console.error('Logic compilation error for ' + obj.name + ':', e);
                }
            }
        }
        
        // Game loop
        let lastTime = 0;
        
        app.ticker.add((ticker) => {
            const time = ticker.lastTime;
            const delta = ticker.deltaMS;
            
            for (const obj of sceneObjects) {
                if (!obj.isVisible) continue;
                
                const sprite = sprites[obj.id];
                const data = objectData[obj.id];
                
                if (!sprite || !data) continue;
                
                // Execute logic
                const logicFn = logicFunctions[obj.id];
                if (logicFn) {
                    try {
                        logicFn(data, sprite, app, time, window.keys, sprites, objectData);
                        
                        // Sync data changes to sprite
                        sprite.x = data.x;
                        sprite.y = data.y;
                        if (data.width !== undefined) sprite.width = data.width;
                        if (data.height !== undefined) sprite.height = data.height;
                        sprite.rotation = (data.rotation * Math.PI) / 180;
                        sprite.alpha = data.opacity;
                    } catch (e) {
                        // Suppress runtime errors to keep game running
                    }
                }
            }
            
            lastTime = time;
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            const ratio = Math.min(
                window.innerWidth / 800,
                window.innerHeight / 600
            );
            app.canvas.style.width = (800 * ratio) + 'px';
            app.canvas.style.height = (600 * ratio) + 'px';
        });
        
        // Trigger initial resize
        window.dispatchEvent(new Event('resize'));
    </script>
</body>
</html>`

  if (returnString) return html

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.toLowerCase().replace(/\\s+/g, '-')}.html`
  a.click()
  URL.revokeObjectURL(url)
}
