import React, { useState } from 'react'
import { MessageSquare, Settings2, Sparkles, Send, Trash2, Move, Maximize2 } from 'lucide-react'
import { useGameStore, SceneObject } from '../../store/useGameStore'
import { blink } from '../../lib/blink'
import { generateId } from '../../lib/ids'
import { toast } from 'sonner'

export function SidebarRight() {
  const [activeTab, setActiveTab] = useState<'chat' | 'properties'>('chat')
  const { selectedObjectId, sceneObjects, updateObject, removeObject, addObject, currentProject, assets } = useGameStore()
  const [messages, setMessages] = useState<{ id: string, role: 'user' | 'assistant', content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const selectedObject = sceneObjects.find(obj => obj.id === selectedObjectId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentProject) return

    const userMsg = { id: generateId(), role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const { object } = await blink.ai.generateObject({
        prompt: `The user says: "${input}". 
        Current scene objects: ${JSON.stringify(sceneObjects)}. 
        Available assets: ${JSON.stringify(assets)}.
        Respond with actions to update the scene. 
        You can update existing objects, add new ones (if you have asset info), or remove them.
        Provide valid JavaScript logic if requested.`,
        schema: {
          type: 'object',
          properties: {
            reply: { type: 'string', description: 'What to say to the user' },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['update', 'add', 'remove'] },
                  id: { type: 'string' },
                  assetId: { type: 'string' },
                  updates: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      x: { type: 'number' },
                      y: { type: 'number' },
                      width: { type: 'number' },
                      height: { type: 'number' },
                      rotation: { type: 'number' },
                      opacity: { type: 'number' },
                      logic: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          required: ['reply']
        }
      })

      const aiMsg = { id: generateId(), role: 'assistant' as const, content: (object as any).reply }
      setMessages(prev => [...prev, aiMsg])

      // Execute actions
      if ((object as any).actions) {
        for (const action of (object as any).actions) {
          if (action.type === 'update' && action.id) {
            updateObject(action.id, action.updates)
          } else if (action.type === 'remove' && action.id) {
            removeObject(action.id)
          } else if (action.type === 'add' && action.assetId) {
            const asset = assets.find(a => a.id === action.assetId)
            if (asset) {
              const newObj: SceneObject = {
                id: generateId('obj_'),
                projectId: currentProject.id,
                userId: currentProject.user_id,
                assetId: asset.id,
                name: asset.name,
                type: asset.type,
                x: action.updates?.x ?? 400,
                y: action.updates?.y ?? 300,
                width: action.updates?.width ?? 100,
                height: action.updates?.height ?? 100,
                rotation: action.updates?.rotation ?? 0,
                opacity: action.updates?.opacity ?? 1,
                properties: {},
                logic: action.updates?.logic ?? '',
                zIndex: sceneObjects.length,
                isVisible: true
              }
              addObject(newObj)
            }
          }
        }
      }
    } catch (error) {
      console.error('AI error:', error)
      toast.error('AI Assistant failed to respond')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <aside className="sidebar-panel sidebar-panel-right">
      <div className="flex border-b">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-secondary text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          AI Assistant
        </button>
        <button 
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'properties' ? 'bg-secondary text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Properties
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-50">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Ask AI to build your game</p>
                    <p className="text-[10px] text-muted-foreground max-w-[200px]">
                      "Make the character move with arrow keys" or "Scale up the background image"
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 text-xs ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  AI is thinking...
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t bg-card">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your command..."
                  rows={2}
                  className="w-full bg-secondary border-none rounded-lg pl-3 pr-10 py-3 text-xs resize-none focus:ring-1 focus:ring-primary outline-none"
                />
                <button 
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 bottom-2 p-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {!selectedObject ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-50">
                <Settings2 className="w-8 h-8" />
                <p className="text-xs">Select an object to edit properties</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Identification</label>
                  <div className="grid gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px]">Name</span>
                      <input 
                        type="text" 
                        value={selectedObject.name}
                        onChange={(e) => updateObject(selectedObject.id, { name: e.target.value })}
                        className="w-full bg-secondary border-none rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Transform</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] flex items-center gap-1"><Move className="w-2.5 h-2.5" /> X</span>
                      <input 
                        type="number" 
                        value={Math.round(selectedObject.x)}
                        onChange={(e) => updateObject(selectedObject.id, { x: Number(e.target.value) })}
                        className="w-full bg-secondary border-none rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] flex items-center gap-1"><Move className="w-2.5 h-2.5" /> Y</span>
                      <input 
                        type="number" 
                        value={Math.round(selectedObject.y)}
                        onChange={(e) => updateObject(selectedObject.id, { y: Number(e.target.value) })}
                        className="w-full bg-secondary border-none rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] flex items-center gap-1"><Maximize2 className="w-2.5 h-2.5" /> Width</span>
                      <input 
                        type="number" 
                        value={Math.round(selectedObject.width)}
                        onChange={(e) => updateObject(selectedObject.id, { width: Number(e.target.value) })}
                        className="w-full bg-secondary border-none rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] flex items-center gap-1"><Maximize2 className="w-2.5 h-2.5" /> Height</span>
                      <input 
                        type="number" 
                        value={Math.round(selectedObject.height)}
                        onChange={(e) => updateObject(selectedObject.id, { height: Number(e.target.value) })}
                        className="w-full bg-secondary border-none rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Logic</label>
                  <textarea 
                    value={selectedObject.logic}
                    onChange={(e) => updateObject(selectedObject.id, { logic: e.target.value })}
                    placeholder="Enter JS logic here..."
                    rows={6}
                    className="w-full bg-secondary border-none rounded-md px-3 py-2 text-[10px] font-mono outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="pt-4 border-t">
                  <button 
                    onClick={() => removeObject(selectedObject.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Object
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
