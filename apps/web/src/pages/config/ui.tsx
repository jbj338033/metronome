import { PageHeader } from '@/shared/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { ManageBlueprints } from '@/features/manage-blueprints/ui'
import { BrowseTemplates } from '@/features/browse-templates/ui'
import { ManageAgents } from '@/features/manage-agents/ui'

export function ConfigPage() {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="blueprints" className="flex h-full flex-col gap-0">
        <PageHeader title="Config">
          <TabsList className="h-7">
            <TabsTrigger value="blueprints" className="text-[13px] px-2.5 h-7">blueprints</TabsTrigger>
            <TabsTrigger value="templates" className="text-[13px] px-2.5 h-7">templates</TabsTrigger>
            <TabsTrigger value="agents" className="text-[13px] px-2.5 h-7">agents</TabsTrigger>
          </TabsList>
        </PageHeader>

        <TabsContent value="blueprints" className="flex-1 overflow-hidden mt-0">
          <ManageBlueprints />
        </TabsContent>
        <TabsContent value="templates" className="flex-1 overflow-hidden mt-0">
          <BrowseTemplates />
        </TabsContent>
        <TabsContent value="agents" className="flex-1 overflow-auto mt-0">
          <ManageAgents />
        </TabsContent>
      </Tabs>
    </div>
  )
}
