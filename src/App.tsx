import React, { useEffect, useState } from 'react'
import { useBlinkAuth } from '@blinkdotnew/react'
import { blink } from './lib/blink'
import { useGameStore } from './store/useGameStore'
import { Header } from './components/layout/Header'
import { SidebarLeft } from './components/layout/SidebarLeft'
import { SidebarRight } from './components/layout/SidebarRight'
import { CanvasContainer } from './components/canvas/CanvasContainer'
import { LandingPage } from './components/pages/LandingPage'
import { Toaster } from 'sonner'

export default function App() {
  const { isAuthenticated, isLoading, user } = useBlinkAuth()
  const { setCurrentProject, setAssets, setSceneObjects } = useGameStore()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize data
      const initData = async () => {
        try {
          // Check for existing projects
          const projects = await blink.db.projects.list({ limit: 1 })
          if (projects && projects.length > 0) {
            const project = projects[0]
            setCurrentProject(project)
            
            // Load assets
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

            // Load objects
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
    } else {
      setIsInitializing(false)
    }
  }, [isAuthenticated, user])

  if (isLoading || isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Initializing Engine...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage />
        <Toaster />
      </>
    )
  }

  return (
    <div className="editor-container">
      <Header />
      <div className="flex flex-1 pt-16 h-full overflow-hidden">
        <SidebarLeft />
        <main className="flex-1 relative bg-[#121214] industrial-grid overflow-hidden">
          <CanvasContainer />
        </main>
        <SidebarRight />
      </div>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  )
}
