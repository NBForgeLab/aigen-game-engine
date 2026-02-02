import React, { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from 'react-konva'
import { useGameStore, SceneObject } from '../../store/useGameStore'
import { generateId } from '../../lib/ids'
import useImage from 'use-image'

interface ObjectRendererProps {
  object: SceneObject
  isSelected: boolean
  onSelect: () => void
  onChange: (updates: Partial<SceneObject>) => void
}

const ObjectRenderer = ({ object, isSelected, onSelect, onChange }: ObjectRendererProps) => {
  const shapeRef = useRef<any>(null)
  const trRef = useRef<any>(null)
  const [image] = useImage(object.type === 'image' ? (object.assetId ? useGameStore.getState().assets.find(a => a.id === object.assetId)?.url || '' : '') : '')

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isSelected])

  const commonProps = {
    onClick: onSelect,
    onTap: onSelect,
    ref: shapeRef,
    draggable: true,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation,
    opacity: object.opacity,
    onDragEnd: (e: any) => {
      onChange({
        x: e.target.x(),
        y: e.target.y(),
      })
    },
    onTransformEnd: (e: any) => {
      const node = shapeRef.current
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()

      node.scaleX(1)
      node.scaleY(1)

      onChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(node.height() * scaleY),
        rotation: node.rotation(),
      })
    },
  }

  return (
    <React.Fragment>
      {object.type === 'image' ? (
        <KonvaImage image={image} {...commonProps} />
      ) : (
        <Rect fill="#3f3f46" {...commonProps} />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox
            }
            return newBox
          }}
        />
      )}
    </React.Fragment>
  )
}

export function CanvasContainer() {
  const { sceneObjects, selectedObjectId, selectObject, updateObject, addObject, currentProject } = useGameStore()
  const [stageSize, setStageSize] = useState({ width: window.innerWidth - 72 * 2, height: window.innerHeight - 64 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('assetId')
    const assetUrl = e.dataTransfer.getData('assetUrl')
    const assetName = e.dataTransfer.getData('assetName')

    if (!assetId || !currentProject) return

    const stage = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - stage.left
    const y = e.clientY - stage.top

    const newObject: SceneObject = {
      id: generateId('obj_'),
      projectId: currentProject.id,
      userId: currentProject.user_id,
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
      isVisible: true
    }

    addObject(newObject)
    selectObject(newObject.id)
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={(e) => {
          const clickedOnEmpty = e.target === e.target.getStage()
          if (clickedOnEmpty) {
            selectObject(null)
          }
        }}
      >
        <Layer>
          {sceneObjects.map((obj) => (
            <ObjectRenderer
              key={obj.id}
              object={obj}
              isSelected={obj.id === selectedObjectId}
              onSelect={() => selectObject(obj.id)}
              onChange={(updates) => updateObject(obj.id, updates)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
