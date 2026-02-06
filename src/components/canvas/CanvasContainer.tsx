import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { useGameStore, SceneObject } from '../../store/useGameStore'
import { generateId } from '../../lib/ids'

export function CanvasContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const stageRef = useRef<PIXI.Container | null>(null)
  const objectsMapRef = useRef<Map<string, PIXI.Container>>(new Map())
  const selectedObjectRef = useRef<string | null>(null)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [zoom, setZoom] = useState(1)

  const { sceneObjects, selectedObjectId, selectObject, updateObject, addObject, currentProject } = useGameStore()

  useEffect(() => {
    if (!containerRef.current) return

    const initializePixi = async () => {
      try {
        const app = new PIXI.Application({
          width: containerRef.current!.clientWidth,
          height: containerRef.current!.clientHeight,
          backgroundColor: 0x121214,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        })

        containerRef.current!.appendChild(app.canvas)
        appRef.current = app

        const stage = new PIXI.Container()
        app.stage.addChild(stage)
        stageRef.current = stage

        let isDragging = false
        let lastX = 0
        let lastY = 0

        app.canvas.addEventListener('mousedown', (e) => {
          isDragging = true
          lastX = e.clientX
          lastY = e.clientY
        })

        app.canvas.addEventListener('mousemove', (e) => {
          if (isDragging) {
            const deltaX = e.clientX - lastX
            const deltaY = e.clientY - lastY
            stage.x += deltaX
            stage.y += deltaY
            setPanX(stage.x)
            setPanY(stage.y)
            lastX = e.clientX
            lastY = e.clientY
          }
        })

        app.canvas.addEventListener('mouseup', () => {
          isDragging = false
        })

        app.canvas.addEventListener('wheel', (e) => {
          e.preventDefault()
          const delta = e.deltaY > 0 ? 0.9 : 1.1
          const newZoom = Math.max(0.5, Math.min(3, zoom * delta))
          setZoom(newZoom)

          const rect = app.canvas.getBoundingClientRect()
          const mouseX = e.clientX - rect.left
          const mouseY = e.clientY - rect.top

          stage.pivot.x = (stage.pivot.x + mouseX / zoom) * (newZoom / zoom) - mouseX / newZoom
          stage.pivot.y = (stage.pivot.y + mouseY / zoom) * (newZoom / zoom) - mouseY / newZoom

          stage.scale.set(newZoom)
        })

        return app
      } catch (error) {
        console.error('Failed to initialize Pixi:', error)
      }
    }

    initializePixi()

    const handleResize = () => {
      if (appRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
        appRef.current.renderer.resize(width, height)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (appRef.current) {
        appRef.current.destroy()
        appRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!appRef.current || !stageRef.current) return

    sceneObjects.forEach((obj) => {
      let container = objectsMapRef.current.get(obj.id)

      if (!container) {
        container = new PIXI.Container()
        container.interactive = true
        container.cursor = 'pointer'

        const graphics = new PIXI.Graphics()
        graphics.beginFill(0x3f3f46)
        graphics.drawRect(0, 0, obj.width, obj.height)
        graphics.endFill()
        graphics.lineStyle(2, obj.id === selectedObjectId ? 0x3b82f6 : 0x666666)
        graphics.drawRect(0, 0, obj.width, obj.height)

        container.addChild(graphics)
        container.objectData = obj
        stageRef.current!.addChild(container)
        objectsMapRef.current.set(obj.id, container)

        let isDraggingObject = false
        let startX = 0
        let startY = 0

        container.on('pointerdown', (e) => {
          isDraggingObject = true
          startX = e.global.x
          startY = e.global.y
          selectObject(obj.id)
          e.stopPropagation()
        })

        container.on('pointermove', (e) => {
          if (isDraggingObject) {
            const deltaX = e.global.x - startX
            const deltaY = e.global.y - startY
            container!.x += deltaX
            container!.y += deltaY
            startX = e.global.x
            startY = e.global.y
            e.stopPropagation()
          }
        })

        container.on('pointerup', () => {
          if (isDraggingObject) {
            isDraggingObject = false
            updateObject(obj.id, {
              x: container!.x,
              y: container!.y,
            })
          }
        })

        container.on('pointerupoutside', () => {
          isDraggingObject = false
        })
      }

      container.x = obj.x
      container.y = obj.y
      container.rotation = (obj.rotation * Math.PI) / 180
      container.alpha = obj.opacity
      container.visible = obj.isVisible
      container.zIndex = obj.zIndex

      if (container.children.length > 0 && container.children[0] instanceof PIXI.Graphics) {
        const graphics = container.children[0] as PIXI.Graphics
        graphics.clear()
        graphics.beginFill(0x3f3f46)
        graphics.drawRect(0, 0, obj.width, obj.height)
        graphics.endFill()
        graphics.lineStyle(2, obj.id === selectedObjectId ? 0x3b82f6 : 0x666666)
        graphics.drawRect(0, 0, obj.width, obj.height)
      }
    })

    objectsMapRef.current.forEach((container, id) => {
      if (!sceneObjects.find((obj) => obj.id === id)) {
        stageRef.current!.removeChild(container)
        objectsMapRef.current.delete(id)
      }
    })

    if (selectedObjectId !== selectedObjectRef.current) {
      selectedObjectRef.current = selectedObjectId
    }
  }, [sceneObjects, selectedObjectId])

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('assetId')
    const assetName = e.dataTransfer.getData('assetName')

    if (!assetId || !currentProject) return

    const rect = containerRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newObject: SceneObject = {
      id: generateId('obj_'),
      projectId: currentProject.id,
      userId: currentProject.userId,
      assetId: assetId,
      name: assetName,
      type: 'image',
      x,
      y,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      properties: {},
      logic: '',
      zIndex: sceneObjects.length,
      isVisible: true,
    }

    addObject(newObject)
    selectObject(newObject.id)
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleCanvasDrop}
      style={{ position: 'relative', overflow: 'hidden' }}
    />
  )
}
