import React, { useState } from 'react'
import { Image, Layers, Plus, Search, Trash2, Volume2, ChevronRight, Eye, EyeOff, GripVertical, Box, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import { useGameStore, SceneObject, Asset } from '../../store/useGameStore'
import { blink } from '../../lib/blink'
import { generateId } from '../../lib/ids'
import { toast } from 'sonner'
import { getEngine } from '../../lib/pixiEngine'

export function SidebarLeft() {
  const [activeTab, setActiveTab] = useState<'assets' | 'hierarchy'>('assets')
  const [searchQuery, setSearchQuery] = useState('')
  const { assets, addAsset, removeAsset, sceneObjects, removeObject, updateObject, selectObject, selectedObjectId, currentProject, addObject, setSceneObjects } = useGameStore()

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const objectTemplates = [
    { type: 'rect' as const, name: 'Rectangle', width: 140, height: 90 },
    { type: 'rect' as const, name: 'Square', width: 120, height: 120 }
  ]

  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentProject) {
      toast.error('No file selected or no project loaded')
      return
    }

    try {
      toast.loading('Uploading asset...', { id: 'upload' })
      
      const extension = file.name.split('.').pop() || ''
      const fileName = `${generateId()}.${extension}`
      
      const { publicUrl } = await blink.storage.upload(
        file,
        `assets/${currentProject.id}/${fileName}`
      )
      
      const newAsset: Asset = {
        id: generateId('ast_'),
        projectId: currentProject.id,
        userId: currentProject.user_id,
        name: file.name,
        type: file.type.startsWith('audio') ? 'sound' : 'image',
        url: publicUrl,
        createdAt: new Date().toISOString()
      }

      // Save to database
      await blink.db.assets.create(newAsset)
      
      // Add to local state
      addAsset(newAsset)
      
      toast.success(`Asset "${file.name}" uploaded`, { id: 'upload' })
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Upload failed - please try again', { id: 'upload' })
    }
    
    // Reset input
    e.target.value = ''
  }

  const handleDeleteAsset = async (asset: Asset) => {
    try {
      await blink.db.assets.delete(asset.id)
      removeAsset(asset.id)
      toast.success(`Deleted asset "${asset.name}"`)
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete asset')
    }
  }

  const handleDuplicateObject = (obj: SceneObject) => {
    if (!currentProject) return
    
    const newObject: SceneObject = {
      ...obj,
      id: generateId('obj_'),
      name: `${obj.name} (copy)`,
      x: obj.x + 20,
      y: obj.y + 20,
      zIndex: sceneObjects.length
    }
    
    addObject(newObject)
    selectObject(newObject.id)
    toast.success(`Duplicated "${obj.name}"`)
  }

  const handleMoveLayer = (obj: SceneObject, direction: 'up' | 'down') => {
    const currentIndex = sceneObjects.findIndex(o => o.id === obj.id)
    if (direction === 'up' && currentIndex < sceneObjects.length - 1) {
      const newObjects = [...sceneObjects]
      const temp = newObjects[currentIndex]
      newObjects[currentIndex] = newObjects[currentIndex + 1]
      newObjects[currentIndex + 1] = temp
      // Update z-indices
      const updated = newObjects.map((o, i) => ({ ...o, zIndex: i }))
      setSceneObjects(updated)
    } else if (direction === 'down' && currentIndex > 0) {
      const newObjects = [...sceneObjects]
      const temp = newObjects[currentIndex]
      newObjects[currentIndex] = newObjects[currentIndex - 1]
      newObjects[currentIndex - 1] = temp
      // Update z-indices
      const updated = newObjects.map((o, i) => ({ ...o, zIndex: i }))
      setSceneObjects(updated)
    }
  }

  const handleAddToScene = (asset: Asset) => {
    if (!currentProject) return
    
    const engine = getEngine()
    const state = engine.getState()
    
    // Add at center of current view
    const centerX = -state.panX / state.zoom + 400
    const centerY = -state.panY / state.zoom + 300
    
    const newObject: SceneObject = {
      id: generateId('obj_'),
      projectId: currentProject.id,
      userId: currentProject.user_id,
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
      x: Math.round(centerX),
      y: Math.round(centerY),
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
    toast.success(`Added "${asset.name}" to scene`)
  }

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('assetId', asset.id)
    e.dataTransfer.setData('assetUrl', asset.url)
    e.dataTransfer.setData('assetName', asset.name)
    e.dataTransfer.setData('assetType', asset.type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleTemplateDragStart = (
    e: React.DragEvent,
    template: { type: 'rect'; name: string; width: number; height: number }
  ) => {
    e.dataTransfer.setData('templateType', template.type)
    e.dataTransfer.setData('templateName', template.name)
    e.dataTransfer.setData('templateWidth', String(template.width))
    e.dataTransfer.setData('templateHeight', String(template.height))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleAddTemplateToScene = (template: { type: 'rect'; name: string; width: number; height: number }) => {
    if (!currentProject) return

    const engine = getEngine()
    const state = engine.getState()

    // Add at center of current view
    const centerX = -state.panX / state.zoom + 400
    const centerY = -state.panY / state.zoom + 300

    const newObject: SceneObject = {
      id: generateId('obj_'),
      projectId: currentProject.id,
      userId: currentProject.user_id,
      name: template.name,
      type: template.type,
      x: Math.round(centerX),
      y: Math.round(centerY),
      width: template.width,
      height: template.height,
      rotation: 0,
      opacity: 1,
      properties: {},
      logic: '',
      zIndex: sceneObjects.length,
      isVisible: true
    }

    addObject(newObject)
    selectObject(newObject.id)
    toast.success(`Added "${template.name}" to scene`)
  }

  return (
    <aside className="sidebar-panel">
      <div className="flex border-b">
        <button 
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'assets' ? 'bg-secondary text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Image className="w-3.5 h-3.5" />
          Assets
        </button>
        <button 
          onClick={() => setActiveTab('hierarchy')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'hierarchy' ? 'bg-secondary text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Layers className="w-3.5 h-3.5" />
          Hierarchy
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'assets' ? (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search assets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary border-none rounded-md pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Objects (templates) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Objects</p>
                <p className="text-[10px] text-muted-foreground">Drag to canvas</p>
              </div>
              <div className="space-y-1">
                {objectTemplates.map((tpl) => (
                  <div
                    key={tpl.name}
                    draggable
                    onDragStart={(e) => handleTemplateDragStart(e, tpl)}
                    onDoubleClick={() => handleAddTemplateToScene(tpl)}
                    className="group flex items-center justify-between rounded-md border bg-secondary/50 px-2.5 py-2 text-xs cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
                    title="Double-click to add to scene\nOr drag to canvas"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Box className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="truncate">{tpl.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{tpl.width}×{tpl.height}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Upload Button */}
              <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-secondary hover:border-primary cursor-pointer transition-all group">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] text-muted-foreground group-hover:text-primary font-medium transition-colors">Add Asset</span>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleUploadAsset} 
                  accept="image/*,audio/*" 
                />
              </label>

              {/* Asset Items */}
              {filteredAssets.map((asset) => (
                <div 
                  key={asset.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onDoubleClick={() => handleAddToScene(asset)}
                  className="group relative aspect-square rounded-lg bg-secondary border p-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:border-primary transition-all"
                  title={`${asset.name}\nDouble-click to add to scene\nOr drag to canvas`}
                >
                  {asset.type === 'image' ? (
                    <img 
                      src={asset.url} 
                      alt={asset.name} 
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <Volume2 className="w-8 h-8 text-muted-foreground" />
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 rounded-lg transition-opacity">
                    <span className="text-[9px] text-white font-mono truncate px-2 max-w-full">
                      {asset.name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToScene(asset)
                        }}
                        className="p-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors"
                        title="Add to scene"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAsset(asset)
                        }}
                        className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Drag indicator */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3 text-white/50" />
                  </div>
                </div>
              ))}
            </div>

            {filteredAssets.length === 0 && searchQuery && (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">No assets match "{searchQuery}"</p>
              </div>
            )}

            {assets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No assets yet</p>
                <p className="text-[10px] mt-1">Upload images or sounds to get started</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {sceneObjects.length === 0 ? (
              <div className="text-center py-8">
                <Box className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground">No objects in scene</p>
                <p className="text-[10px] text-muted-foreground mt-1">Drag assets to the canvas</p>
              </div>
            ) : (
              sceneObjects.map((obj, index) => (
                <div 
                  key={obj.id}
                  onClick={() => selectObject(obj.id)}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${
                    selectedObjectId === obj.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${selectedObjectId === obj.id ? '' : 'text-muted-foreground'}`} />
                    <span className="text-[10px] font-mono text-muted-foreground">{index + 1}</span>
                    <span className="text-xs truncate">{obj.name}</span>
                    {obj.logic && (
                      <span className="text-[8px] px-1 py-0.5 bg-primary/20 text-primary rounded">JS</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 ${selectedObjectId === obj.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        updateObject(obj.id, { isVisible: !obj.isVisible })
                      }}
                      className={`p-1 rounded transition-colors ${
                        selectedObjectId === obj.id 
                          ? 'hover:bg-primary-foreground/20' 
                          : 'hover:bg-black/10'
                      }`}
                      title={obj.isVisible ? 'Hide' : 'Show'}
                    >
                      {obj.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        removeObject(obj.id)
                      }}
                      className={`p-1 rounded transition-colors ${
                        selectedObjectId === obj.id 
                          ? 'hover:bg-red-500/30 text-red-200' 
                          : 'hover:bg-red-500/20 text-red-500'
                      }`}
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
