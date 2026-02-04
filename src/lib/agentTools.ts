import { SceneObject, Asset, useGameStore } from '../store/useGameStore'
import { getEngine } from './pixiEngine'
import { generateId } from './ids'

// AI Agent Tools Definition for controlling the game editor
export interface AgentToolCall {
  type: 'addObject' | 'updateObject' | 'removeObject' | 'selectObject' | 
        'setZoom' | 'centerView' | 'addLogic' | 'getSceneInfo'
  params: Record<string, any>
}

export interface AgentToolResult {
  success: boolean
  message: string
  data?: any
}

// Tool definitions for the AI agent schema
export const agentToolsSchema = {
  type: 'object' as const,
  properties: {
    reply: { 
      type: 'string' as const, 
      description: 'What to say to the user' 
    },
    actions: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          tool: { 
            type: 'string' as const, 
            enum: ['addObject', 'updateObject', 'removeObject', 'selectObject', 
                   'setZoom', 'centerView', 'addLogic'] as const,
            description: 'The tool to execute'
          },
          params: {
            type: 'object' as const,
            properties: {
              // For addObject
              assetId: { type: 'string' as const, description: 'Asset ID to use for the new object' },
              name: { type: 'string' as const, description: 'Name for the object' },
              x: { type: 'number' as const, description: 'X position' },
              y: { type: 'number' as const, description: 'Y position' },
              width: { type: 'number' as const, description: 'Width of the object' },
              height: { type: 'number' as const, description: 'Height of the object' },
              rotation: { type: 'number' as const, description: 'Rotation in degrees' },
              opacity: { type: 'number' as const, description: 'Opacity (0-1)' },
              
              // For updateObject/removeObject/selectObject/addLogic
              objectId: { type: 'string' as const, description: 'ID of the object to modify' },
              
              // For addLogic
              logic: { type: 'string' as const, description: 'JavaScript code for game logic' },
              
              // For setZoom
              zoom: { type: 'number' as const, description: 'Zoom level (0.1 to 5)' },
              
              // For updateObject - updates object
              updates: {
                type: 'object' as const,
                properties: {
                  name: { type: 'string' as const },
                  x: { type: 'number' as const },
                  y: { type: 'number' as const },
                  width: { type: 'number' as const },
                  height: { type: 'number' as const },
                  rotation: { type: 'number' as const },
                  opacity: { type: 'number' as const },
                  isVisible: { type: 'boolean' as const },
                  logic: { type: 'string' as const }
                }
              }
            }
          }
        },
        required: ['tool', 'params'] as const
      }
    }
  },
  required: ['reply'] as const
}

// Execute a tool action
export function executeAgentTool(
  action: { tool: string, params: Record<string, any> },
  store: ReturnType<typeof useGameStore.getState>
): AgentToolResult {
  const { tool, params } = action
  const engine = getEngine()
  
  switch (tool) {
    case 'addObject': {
      const { assetId, name, x = 400, y = 300, width = 100, height = 100, rotation = 0, opacity = 1 } = params
      
      if (!store.currentProject) {
        return { success: false, message: 'No project loaded' }
      }
      
      const asset = assetId ? store.assets.find(a => a.id === assetId) : null
      
      const newObject: SceneObject = {
        id: generateId('obj_'),
        projectId: store.currentProject.id,
        userId: store.currentProject.user_id,
        assetId: assetId || undefined,
        name: name || asset?.name || 'New Object',
        type: asset?.type || 'rect',
        x,
        y,
        width,
        height,
        rotation,
        opacity,
        properties: {},
        logic: '',
        zIndex: store.sceneObjects.length,
        isVisible: true
      }
      
      store.addObject(newObject)
      engine.selectObject(newObject.id)
      
      return { 
        success: true, 
        message: `Added object "${newObject.name}" at (${x}, ${y})`,
        data: { objectId: newObject.id }
      }
    }
    
    case 'updateObject': {
      const { objectId, updates } = params
      
      if (!objectId) {
        return { success: false, message: 'No object ID provided' }
      }
      
      const obj = store.sceneObjects.find(o => o.id === objectId)
      if (!obj) {
        return { success: false, message: `Object ${objectId} not found` }
      }
      
      store.updateObject(objectId, updates || {})
      
      return { 
        success: true, 
        message: `Updated object "${obj.name}"`,
        data: { objectId }
      }
    }
    
    case 'removeObject': {
      const { objectId } = params
      
      if (!objectId) {
        return { success: false, message: 'No object ID provided' }
      }
      
      const obj = store.sceneObjects.find(o => o.id === objectId)
      if (!obj) {
        return { success: false, message: `Object ${objectId} not found` }
      }
      
      store.removeObject(objectId)
      
      return { 
        success: true, 
        message: `Removed object "${obj.name}"` 
      }
    }
    
    case 'selectObject': {
      const { objectId } = params
      
      engine.selectObject(objectId || null)
      store.selectObject(objectId || null)
      
      return { 
        success: true, 
        message: objectId ? `Selected object ${objectId}` : 'Deselected all objects'
      }
    }
    
    case 'setZoom': {
      const { zoom = 1 } = params
      
      engine.setZoom(zoom)
      
      return { 
        success: true, 
        message: `Set zoom to ${Math.round(zoom * 100)}%` 
      }
    }
    
    case 'centerView': {
      engine.centerView()
      
      return { 
        success: true, 
        message: 'Centered view' 
      }
    }
    
    case 'addLogic': {
      const { objectId, logic } = params
      
      if (!objectId) {
        return { success: false, message: 'No object ID provided' }
      }
      
      if (!logic) {
        return { success: false, message: 'No logic code provided' }
      }
      
      const obj = store.sceneObjects.find(o => o.id === objectId)
      if (!obj) {
        return { success: false, message: `Object ${objectId} not found` }
      }
      
      store.updateObject(objectId, { logic })
      
      return { 
        success: true, 
        message: `Added logic to "${obj.name}"` 
      }
    }
    
    default:
      return { success: false, message: `Unknown tool: ${tool}` }
  }
}

// Generate context for the AI agent
export function generateSceneContext(
  sceneObjects: SceneObject[], 
  assets: Asset[],
  selectedId: string | null
): string {
  const objectsList = sceneObjects.map(obj => ({
    id: obj.id,
    name: obj.name,
    type: obj.type,
    position: { x: Math.round(obj.x), y: Math.round(obj.y) },
    size: { width: Math.round(obj.width), height: Math.round(obj.height) },
    rotation: obj.rotation,
    opacity: obj.opacity,
    visible: obj.isVisible,
    hasLogic: !!obj.logic,
    assetId: obj.assetId
  }))
  
  const assetsList = assets.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type
  }))
  
  return JSON.stringify({
    sceneObjects: objectsList,
    assets: assetsList,
    selectedObjectId: selectedId,
    totalObjects: sceneObjects.length,
    totalAssets: assets.length
  }, null, 2)
}

// System prompt for the AI agent
export const agentSystemPrompt = `You are an AI game development assistant for a 2D game engine called AIGen Engine.

You help users build games by:
1. Adding and manipulating game objects on the canvas
2. Writing JavaScript game logic for objects
3. Managing assets and scene hierarchy
4. Providing guidance on game development

AVAILABLE TOOLS:
- addObject: Add a new object to the scene. Params: assetId (optional), name, x, y, width, height, rotation, opacity
- updateObject: Update an existing object. Params: objectId, updates (object with properties to change)
- removeObject: Remove an object from the scene. Params: objectId
- selectObject: Select an object. Params: objectId (or null to deselect)
- setZoom: Change canvas zoom. Params: zoom (0.1 to 5)
- centerView: Center the canvas view
- addLogic: Add JavaScript logic to an object. Params: objectId, logic

LOGIC CODE CONTEXT:
When writing logic code, you have access to:
- obj: The current object with properties (x, y, width, height, rotation, opacity)
- ctx: Canvas 2D context (when exported)
- canvas: The canvas element
- time: Current animation frame time

EXAMPLE LOGIC for movement:
\`\`\`
// Move right
obj.x += 2;

// Keyboard movement
if (window.keys?.ArrowRight) obj.x += 5;
if (window.keys?.ArrowLeft) obj.x -= 5;
if (window.keys?.ArrowUp) obj.y -= 5;
if (window.keys?.ArrowDown) obj.y += 5;

// Boundary check
if (obj.x > canvas.width) obj.x = 0;
if (obj.x < 0) obj.x = canvas.width;
\`\`\`

When the user asks you to do something, analyze the current scene context and use the appropriate tools.
Always explain what you're doing in your reply.`
