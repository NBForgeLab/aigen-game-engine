import React from 'react'
import { useBlinkAuth } from '@blinkdotnew/react'
import { blink } from '../../lib/blink'
import { useGameStore } from '../../store/useGameStore'
import { generateId } from '../../lib/ids'
import { Box, Sparkles, Zap, Globe, Github } from 'lucide-react'
import { toast } from 'sonner'

export function LandingPage() {
  const { setCurrentProject } = useGameStore()
  const { user } = useBlinkAuth()

  const handleLogin = () => {
    blink.auth.login(window.location.href)
  }

  const handleStart = async () => {
    if (!user) {
      handleLogin()
      return
    }

    try {
      toast.loading('Creating project...', { id: 'create-project' })
      const newProject = {
        id: generateId('prj_'),
        name: 'My Awesome Game',
        description: 'A new game project built with AIGen Engine',
        userId: user.id,
      }
      await blink.db.projects.create(newProject)
      setCurrentProject(newProject)
      toast.success('Project created!', { id: 'create-project' })
    } catch (error) {
      console.error('Failed to create project:', error)
      toast.error('Failed to create project', { id: 'create-project' })
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col selection:bg-primary/30">
      <nav className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-[#09090b]/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Box className="w-6 h-6 text-black" />
          </div>
          <span className="text-lg font-black tracking-tighter">AIGen Engine</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={handleLogin} className="text-sm font-medium hover:text-white/70 transition-colors">Sign In</button>
          <button 
            onClick={handleStart}
            className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-white/90 transition-all active:scale-95"
          >
            Get Started Free
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center pt-32 px-6">
        <div className="max-w-4xl text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
            <Sparkles className="w-3 h-3 text-primary" />
            AI-Powered Game Engine
          </div>
          
          <h2 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9]">
            Build games <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">at the speed of thought.</span>
          </h2>
          
          <p className="text-lg text-white/40 max-w-2xl mx-auto font-medium leading-relaxed">
            A professional-grade, AI-powered HTML game builder with drag-and-drop canvas, 
            manual asset management, and a real-time AI assistant.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-white text-black text-lg font-bold rounded-full hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all active:scale-95 flex items-center gap-3"
            >
              Start Building Now
              <Zap className="w-5 h-5 fill-current" />
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 text-white text-lg font-bold rounded-full hover:bg-white/10 transition-all flex items-center gap-3">
              View Showcase
              <Globe className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-32 w-full max-w-6xl relative animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="absolute -inset-0.5 bg-gradient-to-b from-white/20 to-transparent rounded-2xl blur-xl opacity-20" />
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden aspect-[16/10] shadow-2xl backdrop-blur-3xl">
            <div className="absolute top-0 left-0 right-0 h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full industrial-grid opacity-20" />
              <div className="absolute flex flex-col items-center gap-4">
                 <div className="w-16 h-16 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center">
                    <Box className="w-8 h-8 text-white/40" />
                 </div>
                 <p className="text-white/20 font-mono text-xs tracking-widest uppercase">Engine Preview</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-white/10 mt-32 px-12 flex flex-col lg:flex-row items-center justify-between gap-8 text-white/40 text-xs font-medium">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4" />
          <span>© 2024 AIGen Game Engine. Built with Blink.</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <div className="flex items-center gap-4">
             <Github className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  )
}
