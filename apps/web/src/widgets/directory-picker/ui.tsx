import { useState, useEffect } from 'react'
import { Folder, ChevronRight, ArrowUp, FolderOpen } from 'lucide-react'
import { api } from '@/shared/api/client'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

interface DirectoryPickerProps {
  value: string
  onChange: (path: string) => void
  className?: string
}

export function DirectoryPicker({ value, onChange, className }: DirectoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [currentPath, setCurrentPath] = useState(value || '/')
  const [entries, setEntries] = useState<Array<{ name: string; type: string }>>([])
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')

  useEffect(() => {
    if (!open) return
    setCurrentPath(value || '/')
  }, [open, value])

  useEffect(() => {
    if (!open) return
    loadDir(currentPath)
  }, [open, currentPath])

  async function loadDir(dirPath: string) {
    setLoading(true)
    setError(null)
    try {
      const result = await api.fs.list(dirPath)
      setEntries(result.entries)
      setParentPath(result.parent)
      setCurrentPath(result.path)
      setManualInput(result.path)
    } catch {
      setError('cannot access directory')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  function handleSelect() {
    onChange(currentPath)
    setOpen(false)
  }

  function handleManualSubmit(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && manualInput.trim()) {
      setCurrentPath(manualInput.trim())
    }
  }

  const pathSegments = currentPath.split('/').filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            'flex h-8 items-center gap-2 rounded-md border border-input bg-secondary px-3 text-xs text-left text-foreground/80 hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-colors truncate outline-none',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <FolderOpen size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{value || 'select directory...'}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">select directory</DialogTitle>
        </DialogHeader>

        <Input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={handleManualSubmit}
          placeholder="/path/to/directory"
          className="h-8 text-xs font-mono"
        />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          <button onClick={() => setCurrentPath('/')} className="hover:text-foreground transition-colors shrink-0">/</button>
          {pathSegments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight size={10} />
              <button
                onClick={() => setCurrentPath('/' + pathSegments.slice(0, i + 1).join('/'))}
                className="hover:text-foreground transition-colors"
              >
                {seg}
              </button>
            </div>
          ))}
        </div>

        {/* Directory list */}
        <div className="max-h-64 overflow-auto rounded-md border border-border">
          {parentPath && (
            <button
              onClick={() => setCurrentPath(parentPath)}
              className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
            >
              <ArrowUp size={14} />
              ..
            </button>
          )}

          {loading ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">loading...</div>
          ) : error ? (
            <div className="px-3 py-6 text-center text-xs text-red-400">{error}</div>
          ) : entries.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">empty directory</div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.name}
                onClick={() => setCurrentPath(`${currentPath === '/' ? '' : currentPath}/${entry.name}`)}
                className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-xs text-foreground/80 hover:bg-accent/50 transition-colors last:border-0"
              >
                <Folder size={14} className="shrink-0 text-muted-foreground" />
                {entry.name}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="truncate font-mono text-xs text-muted-foreground max-w-[300px]">{currentPath}</span>
          <Button onClick={handleSelect} size="sm">
            select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
