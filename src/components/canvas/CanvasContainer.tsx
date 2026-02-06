import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { useGameStore, SceneObject } from '../../store/useGameStore'
import { generateId } from '../../lib/ids'

export function CanvasContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const stageRef = useRef<PIXI.Container | null>(null)
  const objectsMapRef = useRef<Map<string, PIXI.Container>>(new Map())
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 })
  const panStateRef = useRef({ isDragging: false, startX: 0, startY: 0 })

  const { sceneObjects, selectedObjectId, selectObject, updateObject, addObject, currentProject } = useGameStore()

  useEffect(() => {
    if (!containerRef.current) return

    const initializePixi = async () => {
      try {
        const width = containerRef.current!.clientWidth
        const height = containerRef.current!.clientHeight

        const app = new PIXI.Application({
          width,
          height,
          backgroundColor: 0x1a1a1a,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        })

        containerRef.current!.appendChild(app.canvas)
        appRef.current = app

        const stage = new PIXI.Container()
        app.stage.addChild(stage)
        stageRef.current = stage

        app.canvas.style.display = 'block'

        const handleMouseDown = (e: MouseEvent) => {
          if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
            panStateRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY }
            app.canvas.style.cursor = 'grabbing'
            e.preventDefault()
          }
        }

        const handleMouseMove = (e: MouseEvent) => {
          if (panStateRef.current.isDragging) {
            const deltaX = e.clientX - panStateRef.current.startX
            const deltaY = e.clientY - panStateRef.current.startY

            stage.x += deltaX
            stage.y += deltaY
            cameraRef.current.x += deltaX / cameraRef.current.zoom
            cameraRef.current.y += deltaY / cameraRef.current.zoom

            panStateRef.current.startX = e.clientX
            panStateRef.current.startY = e.clientY
          }
        }

        const handleMouseUp = () => {
          panStateRef.current.isDragging = false
          app.canvas.style.cursor = 'default'
        }

        const handleWheel = (e: WheelEvent) => {
          e.preventDefault()

          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
          const newZoom = Math.max(0.1, Math.min(5, cameraRef.current.zoom * zoomFactor))

          const rect = app.canvas.getBoundingClientRect()
          const mouseX = (e.clientX - rect.left) / cameraRef.current.zoom
          const mouseY = (e.clientY - rect.top) / cameraRef.current.zoom

          const worldX = (e.clientX - rect.left) / newZoom + (cameraRef.current.x - stage.x / newZoom)
          const worldY = (e.clientY - rect.top) / newZoom + (cameraRef.current.y - stage.y / newZoom)

          stage.scale.set(newZoom)
          stage.x = -worldX * newZoom + (e.clientX - rect.left)
          stage.y = -worldY * newZoom + (e.clientY - rect.top)

          cameraRef.current.zoom = newZoom
          cameraRef.current.x = worldX
          cameraRef.current.y = worldY
        }

        app.canvas.addEventListener('mousedown', handleMouseDown)
        app.canvas.addEventListener('mousemove', handleMouseMove)
        app.canvas.addEventListener('mouseup', handleMouseUp)
        app.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
        app.canvas.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
          app.canvas.removeEventListener('mousedown', handleMouseDown)
          app.canvas.removeEventListener('mousemove', handleMouseMove)
          app.canvas.removeEventListener('mouseup', handleMouseUp)
          app.canvas.removeEventListener('wheel', handleWheel)
        }
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
        container.eventMode = 'static'
        container.cursor = 'pointer'
        container.hitArea = new PIXI.Rectangle(0, 0, obj.width, obj.height)

        const rect = new PIXI.Graphics()
        rect.fill(0x2a2a2a)
        rect.rect(0, 0, obj.width, obj.height)
        container.addChild(rect)

        const border = new PIXI.Graphics()
        container.addChild(border)

        container.addChild(rect)
        stageRef.current!.addChild(container)
        objectsMapRef.current.set(obj.id, container)

        let isDraggingObject = false
        let dragStartX = 0
        let dragStartY = 0

        container.on('pointerdown', (e) => {
          if (!panStateRef.current.isDragging) {
            isDraggingObject = true
            dragStartX = e.global.x / cameraRef.current.zoom
            dragStartY = e.global.y / cameraRef.current.zoom
            selectObject(obj.id)
            e.stopPropagation()
          }
        })

        container.on('pointermove', (e) => {
          if (isDraggingObject) {
            const newX = e.global.x / cameraRef.current.zoom - dragStartX + obj.x
            const newY = e.global.y / cameraRef.current.zoom - dragStartY + obj.y

            container!.x = newX
            container!.y = newY
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
      container.hitArea = new PIXI.Rectangle(0, 0, obj.width, obj.height)

      if (container.children.length >= 2) {
        const rect = container.children[0] as PIXI.Graphics
        const border = container.children[1] as PIXI.Graphics

        rect.clear()
        rect.fill(0x2a2a2a)
        rect.rect(0, 0, obj.width, obj.height)

        border.clear()
        if (obj.id === selectedObjectId) {
          border.lineStyle(2, 0x3b82f6, 1)
          border.rect(0, 0, obj.width, obj.height)
        }
      }
    })

    const toDelete = Array.from(objectsMapRef.current.keys()).filter(
      (id) => !sceneObjects.find((obj) => obj.id === id)
    )
    toDelete.forEach((id) => {
      const container = objectsMapRef.current.get(id)
      if (container && stageRef.current) {
        stageRef.current.removeChild(container)
      }
      objectsMapRef.current.delete(id)
    })
  }, [sceneObjects, selectedObjectId])

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('assetId')
    const assetName = e.dataTransfer.getData('assetName')

    if (!assetId || !currentProject) return

    const rect = containerRef.current!.getBoundingClientRect()
    const x = (e.clientX - rect.left) / cameraRef.current.zoom - cameraRef.current.x
    const y = (e.clientY - rect.top) / cameraRef.current.zoom - cameraRef.current.y

    const newObject: SceneObject = {
      id: generateId('obj_'),
      projectId: currentProject.id,
      userId: currentProject.userId,
      assetId: assetId,
      name: assetName,
      type: 'sprite',
      x,
      y,
      width: 64,
      height: 64,
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
      className="w-full h-full bg-[#1a1a1a]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleCanvasDrop}
      style={{ position: 'relative', overflow: 'hidden' }}
    />
  )
}
