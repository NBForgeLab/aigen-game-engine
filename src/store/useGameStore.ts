import { create } from 'zustand'

export interface SceneObject {
  id: string
  projectId: string
  userId: string
  assetId?: string
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  properties: Record<string, any>
  logic: string
  zIndex: number
  isVisible: boolean
}

export interface Asset {
  id: string
  projectId: string
  userId: string
  name: string
  type: 'image' | 'sound'
  url: string
  createdAt: string
}

interface GameState {
  currentProject: any | null
  assets: Asset[]
  sceneObjects: SceneObject[]
  selectedObjectId: string | null
  isExporting: boolean
  
  // Actions
  setCurrentProject: (project: any) => void
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  setSceneObjects: (objects: SceneObject[]) => void
  addObject: (object: SceneObject) => void
  updateObject: (id: string, updates: Partial<SceneObject>) => void
  removeObject: (id: string) => void
  selectObject: (id: string | null) => void
  setExporting: (isExporting: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  currentProject: null,
  assets: [],
  sceneObjects: [],
  selectedObjectId: null,
  isExporting: false,

  setCurrentProject: (project) => set({ currentProject: project }),
  setAssets: (assets) => set({ assets }),
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  setSceneObjects: (objects) => set({ sceneObjects: objects }),
  addObject: (object) => set((state) => ({ sceneObjects: [...state.sceneObjects, object] })),
  updateObject: (id, updates) => set((state) => ({
    sceneObjects: state.sceneObjects.map((obj) => obj.id === id ? { ...obj, ...updates } : obj)
  })),
  removeObject: (id) => set((state) => ({
    sceneObjects: state.sceneObjects.filter((obj) => obj.id !== id),
    selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId
  })),
  selectObject: (id) => set({ selectedObjectId: id }),
  setExporting: (isExporting) => set({ isExporting }),
}))
