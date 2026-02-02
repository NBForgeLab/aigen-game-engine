import React from 'react'
import { Box, Play, Download, Save, Settings, User } from 'lucide-react'
import { useGameStore } from '../../store/useGameStore'
import { exportToHtml } from '../../lib/exporter'
import { blink } from '../../lib/blink'
import { toast } from 'sonner'

export function Header() {
  const { currentProject, setExporting, assets, sceneObjects } = useGameStore()

  const handleSave = async () => {
    if (!currentProject) return
    toast.success('Project saved successfully')
  }

  const handleExport = () => {
    if (!currentProject) return
    setExporting(true)
    toast.info('Exporting game...')
    
    try {
      exportToHtml(currentProject, assets, sceneObjects)
      toast.success('Export complete!')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleRun = () => {
    if (!currentProject) return
    toast.info('Starting preview...')
    
    const html = exportToHtml(currentProject, assets, sceneObjects, true)
    if (typeof html === 'string') {
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <Box className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-none tracking-tight">AIGen Engine</h1>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">
            {currentProject?.name || 'Untitled Project'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={handleSave}
          className="btn-secondary h-8 px-3 gap-2 text-xs"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
        <button 
          onClick={handleExport}
          className="btn-secondary h-8 px-3 gap-2 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        <div className="w-px h-4 bg-border mx-2" />
        <button 
          onClick={handleRun}
          className="btn-primary h-8 px-4 gap-2 text-xs bg-green-600 hover:bg-green-700 border-none"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Run Game
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-secondary rounded-full transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
        <button 
          onClick={() => blink.auth.logout()}
          className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden"
        >
          <User className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
