import React, { useState } from 'react'
import { Image, Layers, Plus, Search, Trash2, Volume2, ChevronRight, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { useGameStore } from '../../store/useGameStore'
import { blink } from '../../lib/blink'
import { generateId } from '../../lib/ids'
import { toast } from 'sonner'

export function SidebarLeft() {
  const [activeTab, setActiveTab] = useState<'assets' | 'hierarchy'>('assets')
  const { assets, addAsset, sceneObjects, removeObject, updateObject, selectObject, selectedObjectId, currentProject } = useGameStore()

  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentProject) return

    try {
      toast.loading('Uploading asset...', { id: 'upload' })
      const { publicUrl } = await blink.storage.upload(
        file,
        `assets/${currentProject.id}/${generateId()}-${file.name}`
      )
      
      const newAsset = {
        id: generateId('ast_'),
        projectId: currentProject.id,
        userId: currentProject.user_id,
        name: file.name,
        type: file.type.startsWith('audio') ? 'sound' : 'image' as any,
        url: publicUrl,
        createdAt: new Date().toISOString()
      }

      await blink.db.assets.create(newAsset)
      addAsset(newAsset)
      toast.success('Asset uploaded', { id: 'upload' })
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Upload failed', { id: 'upload' })
    }
  }

  return (
    <aside className="sidebar-panel">
      <div className="flex border-b">
        <button 
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'assets' ? 'bg-secondary text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <Image className="w-3.5 h-3.5" />
          Assets
        </button>
        <button 
          onClick={() => setActiveTab('hierarchy')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'hierarchy' ? 'bg-secondary text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <Layers className="w-3.5 h-3.5" />
          Hierarchy
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'assets' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search assets..." 
                className="w-full bg-secondary border-none rounded-md pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-secondary cursor-pointer transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Add Asset</span>
                <input type="file" className="hidden" onChange={handleUploadAsset} accept="image/*,audio/*" />
              </label>

              {assets.map((asset) => (
                <div 
                  key={asset.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('assetId', asset.id)
                    e.dataTransfer.setData('assetUrl', asset.url)
                    e.dataTransfer.setData('assetName', asset.name)
                  }}
                  className="group relative aspect-square rounded-lg bg-secondary border p-2 flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing hover:border-primary transition-all"
                >
                  {asset.type === 'image' ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
                  ) : (
                    <Volume2 className="w-8 h-8 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                    <span className="text-[8px] text-white font-mono truncate px-1 max-w-full">
                      {asset.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {sceneObjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground italic">No objects in scene</p>
              </div>
            ) : (
              sceneObjects.map((obj) => (
                <div 
                  key={obj.id}
                  onClick={() => selectObject(obj.id)}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedObjectId === obj.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs truncate">{obj.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        updateObject(obj.id, { isVisible: !obj.isVisible })
                      }}
                      className="p-1 hover:bg-black/10 rounded"
                    >
                      {obj.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        removeObject(obj.id)
                      }}
                      className="p-1 hover:bg-red-500/20 text-red-500 rounded"
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
