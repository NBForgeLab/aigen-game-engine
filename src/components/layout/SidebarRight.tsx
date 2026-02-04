import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Settings2, Sparkles, Send, Trash2, Move, Maximize2, RotateCw, Eye, EyeOff, Code2 } from 'lucide-react'
import { useGameStore, SceneObject } from '../../store/useGameStore'
import { blink } from '../../lib/blink'
import { generateId } from '../../lib/ids'
import { toast } from 'sonner'
import { agentToolsSchema, agentSystemPrompt, executeAgentTool, generateSceneContext } from '../../lib/agentTools'

export function SidebarRight() {
  const [activeTab, setActiveTab] = useState<'chat' | 'properties'>('chat')
  const { selectedObjectId, sceneObjects, updateObject, removeObject, selectObject, currentProject, assets } = useGameStore()
  const [messages, setMessages] = useState<{ id: string, role: 'user' | 'assistant', content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const selectedObject = sceneObjects.find(obj => obj.id === selectedObjectId)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentProject) return

    const userMsg = { id: generateId(), role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      // Generate scene context for the AI
      const sceneContext = generateSceneContext(sceneObjects, assets, selectedObjectId)
      
      const { object } = await blink.ai.generateObject({
        model: 'gpt-4.1-mini',
        prompt: `${agentSystemPrompt}

CURRENT SCENE STATE:
${sceneContext}

USER REQUEST: "${input}"

Analyze the request and respond with appropriate actions. Always provide a helpful reply.`,
        schema: agentToolsSchema
      })

      const response = object as { reply: string, actions?: Array<{ tool: string, params: Record<string, any> }> }
      
      // Add AI response
      const aiMsg = { id: generateId(), role: 'assistant' as const, content: response.reply }
      setMessages(prev => [...prev, aiMsg])

      // Execute any actions
      if (response.actions && response.actions.length > 0) {
        const store = useGameStore.getState()
        
        for (const action of response.actions) {
          const result = executeAgentTool(action, store)
          
          if (!result.success) {
            console.warn('Tool execution warning:', result.message)
          }
        }
        
        toast.success(`Executed ${response.actions.length} action(s)`)
      }
    } catch (error) {
      console.error('AI error:', error)
      toast.error('AI Assistant failed to respond')
      
      // Add error message
      const errorMsg = { 
        id: generateId(), 
        role: 'assistant' as const, 
        content: 'Sorry, I encountered an error processing your request. Please try again.' 
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
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
                  <div className="space-y-2">
                    <p className="text-sm font-bold">AI Game Assistant</p>
                    <p className="text-[10px] text-muted-foreground max-w-[200px]">
                      Ask me to add objects, write game logic, or modify your scene.
                    </p>
                    <div className="text-[9px] text-muted-foreground space-y-1 pt-2">
                      <p>"Add a player sprite at the center"</p>
                      <p>"Make the character move with arrow keys"</p>
                      <p>"Scale up the background to 200x200"</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-lg p-3 text-xs ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
              {isLoading && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>AI is thinking...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t bg-card">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me to modify your game..."
                  rows={2}
                  disabled={isLoading}
                  className="w-full bg-secondary border-none rounded-lg pl-3 pr-10 py-3 text-xs resize-none focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 bottom-2 p-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
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
                {/* Identification */}
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
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">ID</span>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{selectedObject.id}</p>
                    </div>
                  </div>
                </div>

                {/* Transform */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                    <Move className="w-3 h-3" />
                    Transform
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px]">X</span>
                      <input 
                        type="number" 
                        value={Math.round(selectedObject.x)}
                        onChange={(e) => updateObject(selectedObject.id, { x: Number(e.target.value) })}
                        className="w-full bg-secondary border-none rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px]">Y</span>
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

                {/* Appearance */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    Appearance
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] flex items-center gap-1"><RotateCw className="w-2.5 h-2.5" /> Rotation</span>
                      <input 
                        type="number" 
                        value={Math.round(selectedObject.rotation)}
                        onChange={(e) => updateObject(selectedObject.id, { rotation: Number(e.target.value) })}
                        className="w-full bg-secondary border-none rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px]">Opacity</span>
                      <input 
                        type="number" 
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedObject.opacity}
                        onChange={(e) => updateObject(selectedObject.id, { opacity: Number(e.target.value) })}
                        className="w-full bg-secondary border-none rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]">Visible</span>
                    <button
                      onClick={() => updateObject(selectedObject.id, { isVisible: !selectedObject.isVisible })}
                      className={`p-2 rounded-md transition-colors ${selectedObject.isVisible ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
                    >
                      {selectedObject.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Logic */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                    <Code2 className="w-3 h-3" />
                    Logic (JavaScript)
                  </label>
                  <textarea 
                    value={selectedObject.logic}
                    onChange={(e) => updateObject(selectedObject.id, { logic: e.target.value })}
                    placeholder="// Enter JS logic here...&#10;// Access: obj, ctx, canvas, time"
                    rows={8}
                    className="w-full bg-secondary border-none rounded-md px-3 py-2 text-[10px] font-mono outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {/* Delete */}
                <div className="pt-4 border-t">
                  <button 
                    onClick={() => {
                      removeObject(selectedObject.id)
                      selectObject(null)
                    }}
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
