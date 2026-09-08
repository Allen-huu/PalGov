import React from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PanelSidebar } from '../components/PanelSidebar'
import { Thought } from '@shared/types'

type ThoughtGraphProps = { items: Thought[]; onSelect: (item: Thought) => void }

const colorFor = (item: Thought): number => {
  const source = item.topics?.[0] ?? item.id
  let hash = 0
  for (const char of source) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  const colors = [0xd17a42, 0x9b7653, 0xb58b55, 0x7d9873, 0x9680a8]
  return colors[Math.abs(hash) % colors.length]
}

const positionsFor = (items: Thought[]): Map<string, THREE.Vector3> => {
  const positions = new Map<string, THREE.Vector3>()
  items.forEach((item, index) => {
    const angle = index * 2.39996
    const radius = 0.85 + (index % 5) * 0.45
    positions.set(item.id, new THREE.Vector3(Math.cos(angle) * radius, Math.sin(index * 1.71) * 0.7, Math.sin(angle) * radius))
  })
  return positions
}

function geometryFor(item: Thought): THREE.BufferGeometry {
  const topics = `${item.topics?.join(' ') ?? ''} ${item.summary ?? ''}`
  if (/学习|知识|研究|阅读|考试/.test(topics)) return new THREE.OctahedronGeometry(0.16, 0)
  if (/计划|项目|任务|工作|产品/.test(topics)) return new THREE.BoxGeometry(0.22, 0.22, 0.22)
  if (/生活|健康|习惯|运动/.test(topics)) return new THREE.SphereGeometry(0.13, 16, 12)
  return new THREE.IcosahedronGeometry(0.15, 1)
}

const ThoughtGraph: React.FC<ThoughtGraphProps> = ({ items, onSelect }) => {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const onSelectRef = React.useRef(onSelect)
  onSelectRef.current = onSelect

  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xf6ede1, 0.09)
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100)
    camera.position.set(0, 1.8, 5.4)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    host.replaceChildren(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 2.7
    controls.maxDistance = 8
    controls.target.set(0, 0, 0)
    scene.add(new THREE.AmbientLight(0xfff3df, 2.2))
    const keyLight = new THREE.PointLight(0xe2a164, 4, 8)
    keyLight.position.set(2, 3, 3)
    scene.add(keyLight)

    const positions = positionsFor(items)
    const graph = new THREE.Group()
    scene.add(graph)
    const nodes = new Map<string, THREE.Mesh>()
    const nodeLights: Array<{ light: THREE.PointLight; phase: number }> = []
    const haloGeometry = new THREE.SphereGeometry(0.18, 16, 16)
    const ringGeometry = new THREE.TorusGeometry(0.23, 0.012, 8, 24)
    const geometries: THREE.BufferGeometry[] = [haloGeometry, ringGeometry]
    const materials: THREE.Material[] = []
    items.forEach((item) => {
      const color = colorFor(item)
      const haloMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, depthWrite: false })
      const halo = new THREE.Mesh(haloGeometry, haloMaterial)
      materials.push(haloMaterial)
      halo.position.copy(positions.get(item.id)!)
      graph.add(halo)
      const nodeGeometry = geometryFor(item)
      geometries.push(nodeGeometry)
      const nodeMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.16, roughness: 0.48, metalness: 0.12 })
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial)
      materials.push(nodeMaterial)
      node.position.copy(positions.get(item.id)!)
      node.userData.thought = item
      const glowLight = new THREE.PointLight(color, 0.22, 1.35, 2)
      glowLight.position.set(0.08, 0.14, 0.2)
      node.add(glowLight)
      nodeLights.push({ light: glowLight, phase: nodeLights.length * 1.7 })
      const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.set(Math.PI / 2.8, 0.25, 0.15)
      node.add(ring)
      materials.push(ringMaterial)
      graph.add(node)
      nodes.set(item.id, node)
    })
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xc99b74, transparent: true, opacity: 0.42 })
    const edgePairs = new Set<string>()
    items.forEach((item) => (item.relations ?? []).forEach((relation) => {
      const other = positions.get(relation.thoughtId)
      if (!other) return
      const key = [item.id, relation.thoughtId].sort().join(':')
      if (edgePairs.has(key)) return
      edgePairs.add(key)
      graph.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([positions.get(item.id)!, other]), lineMaterial))
    }))

    const starPositions = new Float32Array(160 * 3)
    for (let i = 0; i < 160; i++) {
      const angle = i * 2.4
      const radius = 3.4 + (i % 9) * 0.35
      starPositions[i * 3] = Math.cos(angle) * radius
      starPositions[i * 3 + 1] = ((i * 13) % 17) / 5 - 1.7
      starPositions[i * 3 + 2] = Math.sin(angle) * radius
    }
    const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xc8a88b, size: 0.018, transparent: true, opacity: 0.5 }))
    stars.geometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    scene.add(stars)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects([...nodes.values()])[0]?.object.userData.thought as Thought | undefined
      if (hit) onSelectRef.current(hit)
    }
    renderer.domElement.addEventListener('click', handleClick)

    const resize = () => {
      const width = host.clientWidth || 1
      const height = host.clientHeight || 1
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    let frame = 0
    const startedAt = performance.now()
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const elapsed = (performance.now() - startedAt) / 1000
      graph.rotation.y += 0.0008
      stars.rotation.y -= 0.00025
      nodeLights.forEach(({ light, phase }) => {
        light.intensity = 0.17 + (Math.sin(elapsed * 1.15 + phase) + 1) * 0.045
      })
      controls.update()
      renderer.render(scene, camera)
    }
    animate()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('click', handleClick)
      controls.dispose()
      renderer.dispose()
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      lineMaterial.dispose()
      host.replaceChildren()
    }
  }, [items])

  return <div ref={hostRef} className="thought-graph" aria-label="念头知识空间" />
}

export const ThoughtsPage: React.FC = () => {
  const [items, setItems] = React.useState<Thought[]>([])
  const [draft, setDraft] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Thought | null>(null)
  const [message, setMessage] = React.useState('')
  const messageTimerRef = React.useRef<number | null>(null)

  const notify = React.useCallback((text: string, duration = 2600) => {
    if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current)
    setMessage(text)
    if (duration > 0) messageTimerRef.current = window.setTimeout(() => { setMessage(''); messageTimerRef.current = null }, duration)
  }, [])

  React.useEffect(() => () => {
    if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current)
  }, [])

  const refresh = React.useCallback(() => { void window.pet.thoughts.list().then((next) => { setItems(next); setSelected((current) => current ? next.find((item) => item.id === current.id) ?? null : next[0] ?? null) }) }, [])
  React.useEffect(() => { refresh() }, [refresh])

  const add = async (organize: boolean) => {
    if (!draft.trim() || saving) return
    setSaving(true)
    try {
      const item = await window.pet.thoughts.create(draft)
      setDraft('')
      setItems((prev) => [item, ...prev])
      setSelected(item)
      if (organize) {
        notify('正在把这条念头放进知识空间…', 12000)
        const next = await window.pet.thoughts.summarize(item.id)
        if (next) { setItems((prev) => prev.map((current) => current.id === next.id ? next : current)); setSelected(next); notify(next.aiStatus === 'ready' ? '已整理并建立关联' : '已保存，但 AI 暂时无法整理') }
      } else notify('已保存到知识空间')
    } catch { notify('保存失败，请检查数据库连接') }
    setSaving(false)
  }

  const importFile = async () => {
    if (saving) return
    setSaving(true)
    notify('正在读取文件并识别念头…', 12000)
    try {
      const imported = await window.pet.thoughts.importFile()
      if (imported.length) { setItems((prev) => [...imported, ...prev]); setSelected(imported[0]); notify(`已识别 ${imported.length} 条念头`) }
      else notify('没有导入内容')
    } catch { notify('文件识别失败，请选择 txt 或 md 文件') }
    setSaving(false)
  }

  const summarize = async (id: string) => {
    setBusyId(id)
    try {
      const next = await window.pet.thoughts.summarize(id)
      if (next) { setItems((prev) => prev.map((item) => item.id === id ? next : item)); setSelected(next); notify(next.aiStatus === 'ready' ? '整理完成，关系已更新' : 'AI 暂时无法整理，请检查设置') }
    } catch { notify('整理失败，请检查设置中的 AI 服务') }
    setBusyId(null)
  }

  const archive = async (id: string) => {
    await window.pet.thoughts.archive(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
    setSelected(null)
  }

  const related = selected?.relations ?? []

  const resizeComposer = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 76)}px`
  }

  return <main className="panel-root thoughts-space">
    <PanelSidebar />
    <div className="thoughts-main">
      <section className="thoughts-stage">
        <ThoughtGraph items={items} onSelect={setSelected} />
        {selected && <aside className="thought-detail">
          <div className="detail-top"><span className="detail-label">当前念头</span><button className="icon-button" title="关闭详情" onClick={() => setSelected(null)}>×</button></div>
          <div className="detail-summary">{selected.summary || selected.rawText}</div>
          {selected.topics?.length ? <div className="topic-list">{selected.topics.map((topic) => <span key={topic}>#{topic}</span>)}</div> : null}
          <div className="detail-raw">{selected.rawText}</div>
          {selected.sourceName && <div className="detail-source">来源 · {selected.sourceName}</div>}
          <div className="detail-related"><span>连接到</span>{related.length ? related.map((relation) => <div className="relation-item" key={relation.thoughtId}><button onClick={() => { const target = items.find((item) => item.id === relation.thoughtId); if (target) setSelected(target) }}>{relation.summary}</button><small>为什么连接：{relation.reason}<em>{Math.round(relation.confidence * 100)}%</em></small></div>) : <small>没有足够证据建立关联</small>}</div>
          <div className="detail-actions"><button className="btn-ghost btn-sm" disabled={busyId === selected.id} onClick={() => void summarize(selected.id)}>{busyId === selected.id ? '整理中…' : 'AI 整理并连接'}</button><button className="btn-ghost btn-sm" onClick={() => void archive(selected.id)}>归档</button></div>
        </aside>}
      </section>
      {message && <div className="thoughts-message">{message}</div>}
      <section className="thought-composer">
        <button className="composer-plus" title="导入 txt 或 md 文件" onClick={() => void importFile()} disabled={saving}>+</button>
        <textarea className={draft ? 'has-draft' : ''} rows={1} aria-label="输入最新念头" placeholder="写下此刻的念头…" value={draft} onChange={(event) => { setDraft(event.target.value); resizeComposer(event.currentTarget) }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void add(event.ctrlKey || event.metaKey) } }} />
        <div className="composer-tools"><span>{draft.length ? `${draft.length} 字` : 'Enter 发送 · Shift + Enter 换行'}</span><button className="composer-send" title="保存并整理" onClick={() => void add(true)} disabled={saving || !draft.trim()}>↑</button></div>
      </section>
    </div>
  </main>
}
