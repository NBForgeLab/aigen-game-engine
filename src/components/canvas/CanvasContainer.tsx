import { useRef, useEffect, useCallback } from 'react'
import { useGameStore, SceneObject } from '../../store/useGameStore'
import { getEngine, destroyEngine } from '../../lib/pixiEngine'
import { generateId } from '../../lib/ids'
import { ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react'

export function CanvasContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { 
    sceneObjects, 
    assets, 
    selectedObjectId, 
    selectObject, 
    updateObject, 
    addObject, 
    currentProject 
  } = useGameStore()
  
  const engineRef = useRef(getEngine())

  // Initialize PixiJS engine
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const engine = engineRef.current
    
    engine.init(container).then(() => {
      // Setup callbacks
      engine.onSelect((id) => {
        selectObject(id)
      })
      
      engine.onUpdate((id, updates) => {
        updateObject(id, updates)
      })
      
      // Initial sync
      engine.syncObjects(sceneObjects, assets)
    })

    const handleResize = () => engine.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      destroyEngine()
    }
  }, [])

  // Sync objects when they change
  useEffect(() => {
    const engine = engineRef.current
    engine.syncObjects(sceneObjects, assets)
  }, [sceneObjects, assets])

  // Sync selection from store
  useEffect(() => {
    const engine = engineRef.current
    if (engine.getSelectedId() !== selectedObjectId) {
      engine.selectObject(selectedObjectId)
    }
  }, [selectedObjectId])

  // Handle drop from assets panel
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('assetId')
    const assetName = e.dataTransfer.getData('assetName')

    if (!assetId || !currentProject) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const engine = engineRef.current
    const state = engine.getState()
    
    // Convert screen coords to world coords
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldX = (screenX - state.panX) / state.zoom
    const worldY = (screenY - state.panY) / state.zoom

    const asset = assets.find(a => a.id === assetId)
    
    const newObject: SceneObject = {
      id: generateId('obj_'),
      projectId: currentProject.id,
      userId: currentProject.user_id,
      assetId: assetId,
      name: assetName || 'New Object',
      type: asset?.type || 'image',
      x: Math.round(worldX),
      y: Math.round(worldY),
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      properties: {},
      logic: '',
      zIndex: sceneObjects.length,
      isVisible: true
    }

    addObject(newObject)
    selectObject(newObject.id)
  }, [currentProject, assets, sceneObjects, addObject, selectObject])

  const handleZoomIn = () => {
    const engine = engineRef.current
    const state = engine.getState()
    engine.setZoom(Math.min(5, state.zoom * 1.2))
  }

  const handleZoomOut = () => {
    const engine = engineRef.current
    const state = engine.getState()
    engine.setZoom(Math.max(0.1, state.zoom * 0.8))
  }

  const handleCenterView = () => {
    engineRef.current.centerView()
  }

  const zoomLevel = Math.round((engineRef.current?.getState()?.zoom || 1) * 100)

  return (
    <div className="relative w-full h-full">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg border p-1 shadow-lg">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-secondary rounded-md transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono min-w-[48px] text-center">{zoomLevel}%</span>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-secondary rounded-md transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border" />
        <button
          onClick={handleCenterView}
          className="p-2 hover:bg-secondary rounded-md transition-colors"
          title="Center View"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 bg-background/80 backdrop-blur-sm rounded-lg border px-3 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Move className="w-3 h-3" />
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[9px]">Middle Mouse</kbd>
          Pan
        </span>
        <span className="flex items-center gap-1.5">
          <ZoomIn className="w-3 h-3" />
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[9px]">Scroll</kbd>
          Zoom
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[9px]">Alt + Drag</kbd>
          Pan (alt)
        </span>
      </div>

      {/* Info badge */}
      <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm rounded-lg border px-3 py-2">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-muted-foreground">Objects: <span className="text-foreground font-medium">{sceneObjects.length}</span></span>
          <span className="text-muted-foreground">Assets: <span className="text-foreground font-medium">{assets.length}</span></span>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      />
    </div>
  )
}
