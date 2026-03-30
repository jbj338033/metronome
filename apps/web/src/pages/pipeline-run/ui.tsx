import { useParams } from 'react-router'

export function PipelineRunPage() {
  const { id } = useParams()
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Pipeline Run {id}</h1>
    </div>
  )
}
