import * as PIXI from 'pixi.js'
import { SceneObject, Asset } from '../store/useGameStore'

export interface EditorState {
  zoom: number
  panX: number
  panY: number
  selectedId: string | null
  isDragging: boolean
  isPanning: boolean
}

export class PixiGameEngine {
  private app: PIXI.Application | null = null
  private container: HTMLElement | null = null
  private worldContainer: PIXI.Container | null = null
  private gridGraphics: PIXI.Graphics | null = null
  private objectsContainer: PIXI.Container | null = null
  private selectionGraphics: PIXI.Graphics | null = null
  private sprites: Map<string, PIXI.Sprite | PIXI.Graphics> = new Map()
  private textures: Map<string, PIXI.Texture> = new Map()
  
  private state: EditorState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    selectedId: null,
    isDragging: false,
    isPanning: false
  }
  
  private lastMousePos = { x: 0, y: 0 }
  private dragStartPos = { x: 0, y: 0 }
  private dragStartObjPos = { x: 0, y: 0 }
  
  private onSelectCallback: ((id: string | null) => void) | null = null
  private onUpdateCallback: ((id: string, updates: Partial<SceneObject>) => void) | null = null
  
  // Grid settings - GDevelop style
  private gridSize = 32
  private gridColor = 0x2a2a2e
  private gridLineColor = 0x3a3a3e
  private bgColor = 0x1e1e22
  
  async init(container: HTMLElement): Promise<void> {
    this.container = container
    
    this.app = new PIXI.Application()
    await this.app.init({
      background: this.bgColor,
      resizeTo: container,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })
    
    container.appendChild(this.app.canvas as HTMLCanvasElement)
    
    // Create world container (for pan/zoom)
    this.worldContainer = new PIXI.Container()
    this.app.stage.addChild(this.worldContainer)
    
    // Create grid
    this.gridGraphics = new PIXI.Graphics()
    this.worldContainer.addChild(this.gridGraphics)
    
    // Create objects container
    this.objectsContainer = new PIXI.Container()
    this.worldContainer.addChild(this.objectsContainer)
    
    // Create selection indicator
    this.selectionGraphics = new PIXI.Graphics()
    this.worldContainer.addChild(this.selectionGraphics)
    
    // Setup interaction
    this.setupInteraction()
    
    // Initial render
    this.drawGrid()
    this.centerView()
  }
  
  private setupInteraction(): void {
    if (!this.app) return
    
    const canvas = this.app.canvas as HTMLCanvasElement
    
    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, this.state.zoom * zoomDelta))
      
      // Zoom toward mouse position
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const worldBefore = this.screenToWorld(mouseX, mouseY)
      this.state.zoom = newZoom
      const worldAfter = this.screenToWorld(mouseX, mouseY)
      
      this.state.panX += (worldAfter.x - worldBefore.x) * this.state.zoom
      this.state.panY += (worldAfter.y - worldBefore.y) * this.state.zoom
      
      this.updateTransform()
      this.drawGrid()
    }, { passive: false })
    
    // Middle mouse for pan
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect()
      this.lastMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle mouse or Alt+Left for panning
        e.preventDefault()
        this.state.isPanning = true
        canvas.style.cursor = 'grabbing'
      } else if (e.button === 0) {
        // Left click for selection/dragging
        const worldPos = this.screenToWorld(this.lastMousePos.x, this.lastMousePos.y)
        const clickedObject = this.getObjectAtPoint(worldPos.x, worldPos.y)
        
        if (clickedObject) {
          this.selectObject(clickedObject.id)
          this.state.isDragging = true
          this.dragStartPos = { ...worldPos }
          this.dragStartObjPos = { x: clickedObject.x, y: clickedObject.y }
        } else {
          this.selectObject(null)
        }
      }
    })
    
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      if (this.state.isPanning) {
        const dx = mouseX - this.lastMousePos.x
        const dy = mouseY - this.lastMousePos.y
        this.state.panX += dx
        this.state.panY += dy
        this.updateTransform()
        this.drawGrid()
      } else if (this.state.isDragging && this.state.selectedId) {
        const worldPos = this.screenToWorld(mouseX, mouseY)
        const dx = worldPos.x - this.dragStartPos.x
        const dy = worldPos.y - this.dragStartPos.y
        
        const newX = Math.round(this.dragStartObjPos.x + dx)
        const newY = Math.round(this.dragStartObjPos.y + dy)
        
        // Update sprite position visually
        const sprite = this.sprites.get(this.state.selectedId)
        if (sprite) {
          sprite.x = newX
          sprite.y = newY
          this.drawSelection()
        }
      }
      
      this.lastMousePos = { x: mouseX, y: mouseY }
    })
    
    canvas.addEventListener('mouseup', (e) => {
      if (this.state.isDragging && this.state.selectedId) {
        const sprite = this.sprites.get(this.state.selectedId)
        if (sprite && this.onUpdateCallback) {
          this.onUpdateCallback(this.state.selectedId, {
            x: sprite.x,
            y: sprite.y
          })
        }
      }
      
      this.state.isPanning = false
      this.state.isDragging = false
      canvas.style.cursor = 'default'
    })
    
    canvas.addEventListener('mouseleave', () => {
      this.state.isPanning = false
      this.state.isDragging = false
      canvas.style.cursor = 'default'
    })
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }
  
  private screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
    return {
      x: (screenX - this.state.panX) / this.state.zoom,
      y: (screenY - this.state.panY) / this.state.zoom
    }
  }
  
  private getObjectAtPoint(worldX: number, worldY: number): SceneObject | null {
    // Check from top to bottom (reverse z-order)
    const objects = Array.from(this.sprites.entries()).reverse()
    
    for (const [id, sprite] of objects) {
      const bounds = sprite.getBounds()
      const localBounds = {
        x: sprite.x,
        y: sprite.y,
        width: bounds.width / this.state.zoom,
        height: bounds.height / this.state.zoom
      }
      
      if (worldX >= localBounds.x && 
          worldX <= localBounds.x + localBounds.width &&
          worldY >= localBounds.y && 
          worldY <= localBounds.y + localBounds.height) {
        // Return the scene object data
        return (sprite as any).__sceneObject as SceneObject
      }
    }
    
    return null
  }
  
  private updateTransform(): void {
    if (!this.worldContainer) return
    
    this.worldContainer.x = this.state.panX
    this.worldContainer.y = this.state.panY
    this.worldContainer.scale.set(this.state.zoom)
  }
  
  private drawGrid(): void {
    if (!this.gridGraphics || !this.app) return
    
    const g = this.gridGraphics
    g.clear()
    
    const width = this.app.screen.width
    const height = this.app.screen.height
    
    // Calculate visible area in world coords
    const startX = -this.state.panX / this.state.zoom
    const startY = -this.state.panY / this.state.zoom
    const endX = startX + width / this.state.zoom
    const endY = startY + height / this.state.zoom
    
    // Grid step based on zoom
    let gridStep = this.gridSize
    if (this.state.zoom < 0.5) gridStep *= 2
    if (this.state.zoom < 0.25) gridStep *= 2
    if (this.state.zoom > 2) gridStep /= 2
    
    // Round to grid
    const gridStartX = Math.floor(startX / gridStep) * gridStep
    const gridStartY = Math.floor(startY / gridStep) * gridStep
    
    // Draw minor grid lines
    g.setStrokeStyle({ width: 1 / this.state.zoom, color: this.gridColor, alpha: 0.5 })
    
    for (let x = gridStartX; x <= endX; x += gridStep) {
      g.moveTo(x, startY)
      g.lineTo(x, endY)
    }
    
    for (let y = gridStartY; y <= endY; y += gridStep) {
      g.moveTo(startX, y)
      g.lineTo(endX, y)
    }
    
    g.stroke()
    
    // Draw major grid lines (every 4 cells)
    const majorStep = gridStep * 4
    const majorStartX = Math.floor(startX / majorStep) * majorStep
    const majorStartY = Math.floor(startY / majorStep) * majorStep
    
    g.setStrokeStyle({ width: 1 / this.state.zoom, color: this.gridLineColor, alpha: 0.8 })
    
    for (let x = majorStartX; x <= endX; x += majorStep) {
      g.moveTo(x, startY)
      g.lineTo(x, endY)
    }
    
    for (let y = majorStartY; y <= endY; y += majorStep) {
      g.moveTo(startX, y)
      g.lineTo(endX, y)
    }
    
    g.stroke()
    
    // Draw origin cross
    g.setStrokeStyle({ width: 2 / this.state.zoom, color: 0x5a5a66, alpha: 1 })
    g.moveTo(0, startY)
    g.lineTo(0, endY)
    g.moveTo(startX, 0)
    g.lineTo(endX, 0)
    g.stroke()
  }
  
  private drawSelection(): void {
    if (!this.selectionGraphics) return
    
    const g = this.selectionGraphics
    g.clear()
    
    if (!this.state.selectedId) return
    
    const sprite = this.sprites.get(this.state.selectedId)
    if (!sprite) return
    
    const bounds = sprite.getBounds()
    const padding = 4 / this.state.zoom
    
    // Selection rectangle
    g.setStrokeStyle({ width: 2 / this.state.zoom, color: 0x4fc3f7 })
    g.rect(
      sprite.x - padding,
      sprite.y - padding,
      (bounds.width / this.state.zoom) + padding * 2,
      (bounds.height / this.state.zoom) + padding * 2
    )
    g.stroke()
    
    // Corner handles
    const handleSize = 8 / this.state.zoom
    const corners = [
      { x: sprite.x - padding, y: sprite.y - padding },
      { x: sprite.x + (bounds.width / this.state.zoom) + padding - handleSize, y: sprite.y - padding },
      { x: sprite.x - padding, y: sprite.y + (bounds.height / this.state.zoom) + padding - handleSize },
      { x: sprite.x + (bounds.width / this.state.zoom) + padding - handleSize, y: sprite.y + (bounds.height / this.state.zoom) + padding - handleSize }
    ]
    
    g.fill({ color: 0x4fc3f7 })
    corners.forEach(corner => {
      g.rect(corner.x, corner.y, handleSize, handleSize)
    })
    g.fill()
  }
  
  centerView(): void {
    if (!this.app) return
    
    this.state.panX = this.app.screen.width / 2
    this.state.panY = this.app.screen.height / 2
    this.state.zoom = 1
    
    this.updateTransform()
    this.drawGrid()
  }
  
  async loadTexture(asset: Asset): Promise<PIXI.Texture | null> {
    if (this.textures.has(asset.id)) {
      return this.textures.get(asset.id)!
    }
    
    if (asset.type !== 'image') return null
    
    try {
      const texture = await PIXI.Assets.load(asset.url)
      this.textures.set(asset.id, texture)
      return texture
    } catch (error) {
      console.error('Failed to load texture:', error)
      return null
    }
  }
  
  async syncObjects(objects: SceneObject[], assets: Asset[]): Promise<void> {
    if (!this.objectsContainer) return
    
    // Preload all textures
    for (const asset of assets) {
      await this.loadTexture(asset)
    }
    
    // Remove old sprites not in new list
    const currentIds = new Set(objects.map(o => o.id))
    for (const [id, sprite] of this.sprites) {
      if (!currentIds.has(id)) {
        this.objectsContainer.removeChild(sprite)
        sprite.destroy()
        this.sprites.delete(id)
      }
    }
    
    // Add/update sprites
    for (const obj of objects) {
      if (!obj.isVisible) {
        // Hide if not visible
        const existing = this.sprites.get(obj.id)
        if (existing) {
          existing.visible = false
        }
        continue
      }
      
      let sprite = this.sprites.get(obj.id)
      
      if (!sprite) {
        // Create new sprite
        if (obj.type === 'image' && obj.assetId) {
          const texture = this.textures.get(obj.assetId)
          if (texture) {
            sprite = new PIXI.Sprite(texture)
          }
        }
        
        if (!sprite) {
          // Create placeholder rect
          const graphics = new PIXI.Graphics()
          graphics.fill({ color: 0x3f3f46 })
          graphics.rect(0, 0, obj.width, obj.height)
          graphics.fill()
          sprite = graphics as any
        }
        
        this.objectsContainer.addChild(sprite)
        this.sprites.set(obj.id, sprite)
      }
      
      // Update properties
      sprite.x = obj.x
      sprite.y = obj.y
      sprite.width = obj.width
      sprite.height = obj.height
      sprite.rotation = (obj.rotation * Math.PI) / 180
      sprite.alpha = obj.opacity
      sprite.visible = obj.isVisible
      sprite.zIndex = obj.zIndex
      
      // Store reference to scene object
      ;(sprite as any).__sceneObject = obj
    }
    
    // Sort by z-index
    this.objectsContainer.sortChildren()
    
    // Update selection
    this.drawSelection()
  }
  
  selectObject(id: string | null): void {
    this.state.selectedId = id
    this.drawSelection()
    this.onSelectCallback?.(id)
  }
  
  onSelect(callback: (id: string | null) => void): void {
    this.onSelectCallback = callback
  }
  
  onUpdate(callback: (id: string, updates: Partial<SceneObject>) => void): void {
    this.onUpdateCallback = callback
  }
  
  getSelectedId(): string | null {
    return this.state.selectedId
  }
  
  getState(): EditorState {
    return { ...this.state }
  }
  
  setZoom(zoom: number): void {
    this.state.zoom = Math.max(0.1, Math.min(5, zoom))
    this.updateTransform()
    this.drawGrid()
  }
  
  resize(): void {
    if (!this.app || !this.container) return
    this.app.resize()
    this.drawGrid()
  }
  
  destroy(): void {
    if (this.app) {
      this.sprites.forEach(sprite => sprite.destroy())
      this.sprites.clear()
      this.textures.clear()
      this.app.destroy(true, { children: true, texture: true })
      this.app = null
    }
  }
}

// Singleton instance
let engineInstance: PixiGameEngine | null = null

export function getEngine(): PixiGameEngine {
  if (!engineInstance) {
    engineInstance = new PixiGameEngine()
  }
  return engineInstance
}

export function destroyEngine(): void {
  if (engineInstance) {
    engineInstance.destroy()
    engineInstance = null
  }
}
