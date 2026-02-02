import { SceneObject, Asset } from '../store/useGameStore'

export function exportToHtml(project: any, assets: Asset[], sceneObjects: SceneObject[], returnString: boolean = false) {
  const assetsJson = JSON.stringify(assets)
  const sceneObjectsJson = JSON.stringify(sceneObjects)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
    <style>
        body { margin: 0; overflow: hidden; background: #000; }
        canvas { display: block; }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        const assets = ${assetsJson};
        const sceneObjects = ${sceneObjectsJson};
        const images = {};
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Load assets
        let loadedAssets = 0;
        const totalAssets = assets.filter(a => a.type === 'image').length;

        function start() {
            requestAnimationFrame(update);
        }

        if (totalAssets === 0) {
            start();
        } else {
            assets.forEach(asset => {
                if (asset.type === 'image') {
                    const img = new Image();
                    img.src = asset.url;
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        images[asset.id] = img;
                        loadedAssets++;
                        if (loadedAssets === totalAssets) start();
                    };
                }
            });
        }

        function update(time) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            sceneObjects.forEach(obj => {
                if (!obj.isVisible) return;

                ctx.save();
                ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
                ctx.rotate((obj.rotation * Math.PI) / 180);
                ctx.globalAlpha = obj.opacity;
                
                if (obj.type === 'image' && images[obj.assetId]) {
                    ctx.drawImage(images[obj.assetId], -obj.width / 2, -obj.height / 2, obj.width, obj.height);
                } else {
                    ctx.fillStyle = '#3f3f46';
                    ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                }
                
                // Execute logic
                if (obj.logic) {
                    try {
                        // Logic has access to 'obj', 'ctx', 'canvas', 'time'
                        const logicFunc = new Function('obj', 'ctx', 'canvas', 'time', obj.logic);
                        logicFunc(obj, ctx, canvas, time);
                    } catch (e) {
                        // Suppress logic errors in runtime to keep game running
                    }
                }
                
                ctx.restore();
            });

            requestAnimationFrame(update);
        }

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    </script>
</body>
</html>
  `

  if (returnString) return html

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.html`
  a.click()
  URL.revokeObjectURL(url)
}
