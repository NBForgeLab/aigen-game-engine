import React, { useEffect, useState } from 'react'
import { blink } from './lib/blink'
import { useGameStore } from './store/useGameStore'
import { Header } from './components/layout/Header'
import { SidebarLeft } from './components/layout/SidebarLeft'
import { SidebarRight } from './components/layout/SidebarRight'
import { CanvasContainer } from './components/canvas/CanvasContainer'
import { Toaster } from 'sonner'

export default function App() {
  const { setCurrentProject, setAssets, setSceneObjects } = useGameStore()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initData = async () => {
      try {
        const projects = await blink.db.projects.list({ limit: 1 })
        if (projects && projects.length > 0) {
          const project = projects[0]
          setCurrentProject(project)

          const assets = await blink.db.assets.list({
            where: { projectId: project.id }
          })
          setAssets(assets.map((a: any) => ({
            id: a.id,
            projectId: a.projectId,
            userId: a.userId,
            name: a.name,
            type: a.type,
            url: a.url,
            createdAt: a.createdAt
          })))

          const objects = await blink.db.sceneObjects.list({
            where: { projectId: project.id },
            orderBy: { zIndex: 'asc' }
          })
          setSceneObjects(objects.map((o: any) => ({
            id: o.id,
            projectId: o.projectId,
            userId: o.userId,
            assetId: o.assetId,
            name: o.name,
            type: o.type,
            x: o.x,
            y: o.y,
            width: o.width,
            height: o.height,
            rotation: o.rotation,
            opacity: o.opacity,
            properties: JSON.parse(o.properties || '{}'),
            logic: o.logic,
            zIndex: o.zIndex,
            isVisible: Number(o.isVisible) > 0
          })))
        }
      } catch (error) {
        console.error('Failed to initialize data:', error)
      } finally {
        setIsInitializing(false)
      }
    }
    initData()
  }, [])

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Initializing Engine...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-container">
      <Header />
      <div className="flex flex-1 pt-16 h-full overflow-hidden">
        <SidebarLeft />
        <main className="flex-1 relative bg-[#121214] overflow-hidden">
          <CanvasContainer />
        </main>
        <SidebarRight />
      </div>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  )
}
