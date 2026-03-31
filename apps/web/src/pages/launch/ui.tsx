import { PageHeader } from '@/shared/ui/page-header'
import { LaunchForm } from '@/features/launch-form/ui'

export function LaunchPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Launch" />
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <LaunchForm />
      </div>
    </div>
  )
}
