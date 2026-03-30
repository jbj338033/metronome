import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { StepNode, type StepNodeData } from './step-node'
import type { Pipeline, PipelineStep } from '@metronome/types'

const nodeTypes = { step: StepNode }

function pipelineToFlow(pipeline: Pipeline): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 간단한 자동 레이아웃: 의존성 깊이 기반 x좌표
  const depth = new Map<string, number>()
  const getDepth = (step: PipelineStep): number => {
    if (depth.has(step.id)) return depth.get(step.id)!
    if (!step.depends_on || step.depends_on.length === 0) {
      depth.set(step.id, 0)
      return 0
    }
    const maxDep = Math.max(
      ...step.depends_on.map((depId) => {
        const dep = pipeline.steps.find((s) => s.id === depId)
        return dep ? getDepth(dep) : 0
      }),
    )
    depth.set(step.id, maxDep + 1)
    return maxDep + 1
  }

  pipeline.steps.forEach((s) => getDepth(s))

  // 같은 depth의 노드를 세로로 배치
  const byDepth = new Map<number, PipelineStep[]>()
  for (const step of pipeline.steps) {
    const d = depth.get(step.id) || 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(step)
  }

  for (const [d, steps] of byDepth) {
    steps.forEach((step, i) => {
      nodes.push({
        id: step.id,
        type: 'step',
        position: { x: d * 220 + 40, y: i * 120 + 40 },
        data: {
          label: step.id,
          blueprint: step.blueprint,
          fanOut: step.fan_out,
          condition: step.condition,
          approval: step.approval,
        } satisfies StepNodeData,
      })

      for (const dep of step.depends_on || []) {
        edges.push({
          id: `${dep}-${step.id}`,
          source: dep,
          target: step.id,
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#52525b' },
          style: { stroke: '#52525b', strokeWidth: 1.5 },
          animated: false,
        })
      }
    })
  }

  return { nodes, edges }
}

interface PipelineCanvasProps {
  pipeline: Pipeline
  onSelectNode?: (stepId: string | null) => void
  stepStatuses?: Record<string, string>
}

export function PipelineCanvas({ pipeline, onSelectNode, stepStatuses }: PipelineCanvasProps) {
  const initial = useMemo(() => pipelineToFlow(pipeline), [pipeline])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#52525b' }, style: { stroke: '#52525b', strokeWidth: 1.5 } }, eds)),
    [setEdges],
  )

  // 스텝 상태 반영
  const nodesWithStatus = useMemo(() => {
    if (!stepStatuses) return nodes
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, status: stepStatuses[n.id] },
    }))
  }, [nodes, stepStatuses])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodesWithStatus}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_e, node) => onSelectNode?.(node.id)}
        onPaneClick={() => onSelectNode?.(null)}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
      >
        <Background color="#27272a" gap={20} />
        <Controls className="!bg-zinc-900 !border-zinc-800 !rounded-md [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-400" />
      </ReactFlow>
    </div>
  )
}
