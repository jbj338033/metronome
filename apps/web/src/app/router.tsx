import { Routes, Route } from 'react-router'
import { RootLayout } from '@/widgets/layout/ui'
import { DashboardPage } from '@/pages/dashboard/ui'
import { ChatPage } from '@/pages/chat/ui'
import { TasksPage } from '@/pages/tasks/ui'
import { TaskDetailPage } from '@/pages/task-detail/ui'
import { PipelineEditorPage } from '@/pages/pipeline-editor/ui'
import { PipelineRunPage } from '@/pages/pipeline-run/ui'
import { AgentsPage } from '@/pages/agents/ui'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="pipelines/editor" element={<PipelineEditorPage />} />
        <Route path="pipelines/runs/:id" element={<PipelineRunPage />} />
        <Route path="agents" element={<AgentsPage />} />
      </Route>
    </Routes>
  )
}
