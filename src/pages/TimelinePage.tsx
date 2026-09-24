import { useEffect, useMemo, useState } from 'react'
import { Search, Route, X, Trash2, Clock, MapPin, GitMerge, ArrowRight, Layers } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import { buildTimelineEntries, matchPairedScenes } from '@/utils/routeMerge'
import type { RouteGroup, WindowScene } from '@/types'

/** 线路归属标签：目标名称为主，记录原名称不同时标注曾用名 */
function RouteLabel({ scene, canonical }: { scene: WindowScene; canonical: string }) {
  const isAlias = scene.routeName !== canonical
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1 text-mist-400">
      <MapPin className="w-3 h-3 shrink-0" />
      <span className="text-xs">{canonical}</span>
      {isAlias && (
        <span className="rounded bg-dusk-400/10 px-1.5 py-0.5 text-[10px] text-dusk-300">
          曾用名 {scene.routeName}
        </span>
      )}
      <span className="mx-1 text-teal-700">·</span>
      <span className="text-xs">{scene.seatDirection}侧</span>
    </div>
  )
}

function SceneMeta({ scene }: { scene: WindowScene }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      {getTreeIcon(scene.treeDensity)}
      {getPedestrianIcon(scene.pedestrianStatus)}
      {scene.signText && (
        <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
          {scene.signText}
        </span>
      )}
    </div>
  )
}

export default function TimelinePage() {
  const {
    routeGroups,
    selectedRoute,
    currentRouteScenes,
    selectRoute,
    loadAll,
    deleteScene,
    mergeRoutes,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeSource, setMergeSource] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const keyword = search.trim().toLowerCase()
  const filteredGroups = routeGroups.filter(
    (g) =>
      !keyword ||
      g.canonical.toLowerCase().includes(keyword) ||
      g.aliases.some((a) => a.toLowerCase().includes(keyword)),
  )

  const selectedGroup = useMemo(
    () => routeGroups.find((g) => g.canonical === selectedRoute),
    [routeGroups, selectedRoute],
  )

  // 时间线编排交给纯函数：普通记录单独成条，十分钟内同区间同朝向的两条挨着排
  const entries = useMemo(
    () => (selectedRoute ? buildTimelineEntries(currentRouteScenes) : []),
    [selectedRoute, currentRouteScenes],
  )

  const closeMerge = () => {
    setMergeOpen(false)
    setMergeSource('')
    setMergeTarget('')
  }

  // 合并预览：统计两边将新增的并排配对（原编号、时刻、笔记均不动）
  const mergePreview = useMemo(() => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return null
    const source = routeGroups.find((g) => g.canonical === mergeSource)
    const target = routeGroups.find((g) => g.canonical === mergeTarget)
    if (!source || !target) return null

    const sourceNames = new Set(source.scenes.map((s) => s.routeName))
    const byId = new Map(
      [...source.scenes, ...target.scenes].map((s) => [s.id, s] as const),
    )
    const pairs = matchPairedScenes([...source.scenes, ...target.scenes])
    const counted = new Set<string>()
    let crossPairs = 0
    pairs.forEach((partnerId, id) => {
      const key = [id, partnerId].sort().join('|')
      if (counted.has(key)) return
      counted.add(key)
      const a = byId.get(id)
      const b = byId.get(partnerId)
      if (!a || !b) return
      if (sourceNames.has(a.routeName) !== sourceNames.has(b.routeName)) crossPairs += 1
    })

    return { source, target, crossPairs }
  }, [mergeSource, mergeTarget, routeGroups])

  const handleConfirmMerge = () => {
    if (!mergePreview) return
    mergeRoutes(mergeSource, mergeTarget)
    closeMerge()
  }

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  const groupChip = (group: RouteGroup) => (
    <button
      key={group.canonical}
      onClick={() => selectRoute(group.canonical)}
      className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
        selectedRoute === group.canonical
          ? 'bg-dusk-400 text-teal-950'
          : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
      }`}
    >
      <Route className="mr-1 inline w-3 h-3" />
      {group.canonical}
      {group.aliases.length > 0 && (
        <span className={selectedRoute === group.canonical ? 'text-teal-900/70' : 'text-mist-500'}>
          {' '}（{group.aliases.length}）
        </span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-wide text-dusk-400">窗景时间线</h1>
          {routeGroups.length >= 2 && (
            <button
              onClick={() => setMergeOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-dusk-400/40 bg-dusk-400/10 px-3.5 py-1.5 text-xs text-dusk-300 transition-colors hover:bg-dusk-400/20"
            >
              <GitMerge className="w-3.5 h-3.5" />
              合并线路
            </button>
          )}
        </div>

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索线路或曾用名..."
              className="w-full rounded-lg border border-teal-800 bg-teal-900/60 py-2.5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectRoute('')}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                !selectedRoute
                  ? 'bg-dusk-400 text-teal-950'
                  : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
              }`}
            >
              全部
            </button>
            {filteredGroups.map(groupChip)}
          </div>
          {selectedGroup && selectedGroup.aliases.length > 0 && (
            <p className="text-xs text-mist-500">
              曾用名：{selectedGroup.aliases.join('、')}
            </p>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">🪟</div>
            <p className="text-lg">
              {selectedRoute ? '该路线暂无窗景记录' : '选择一条路线，开始浏览窗景'}
            </p>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-teal-800" />
            <div className="space-y-6">
              {entries.map((entry) =>
                entry.paired ? (
                  <div key={`pair-${entry.scenes[0].id}-${entry.scenes[1].id}`} className="relative">
                    <div className="absolute -left-5 top-4 h-2.5 w-2.5 rounded-full bg-dusk-400 ring-4 ring-teal-950" />
                    <div className="rounded-xl border border-dusk-400/30 bg-teal-900/60 p-2.5 shadow-lg shadow-dusk-400/5">
                      <div className="flex items-center gap-1.5 px-1 pb-2 text-[10px] text-dusk-300">
                        <Layers className="w-3 h-3" />
                        同区间 · 同朝向 · 相隔{' '}
                        {Math.max(
                          1,
                          Math.round(
                            Math.abs(
                              new Date(entry.scenes[0].timestamp).getTime() -
                                new Date(entry.scenes[1].timestamp).getTime(),
                            ) / 60000,
                          ),
                        )}{' '}
                        分钟 · 两条保留并排
                      </div>
                      <div className="space-y-2">
                        {entry.scenes.map((scene) => (
                          <button
                            key={scene.id}
                            onClick={() => setDetailScene(scene)}
                            className="group block w-full rounded-lg border border-teal-800 bg-teal-900/70 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40"
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {getWeatherIcon(scene.weather)}
                                <span className="text-sm font-semibold text-mist-100">
                                  {scene.segment}
                                </span>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[11px] text-dusk-400">
                                  {formatTimestamp(scene.timestamp)}
                                </p>
                                <p className="text-[9px] text-mist-500">
                                  {getTimeOfDay(scene.timestamp)}
                                </p>
                              </div>
                            </div>
                            <RouteLabel scene={scene} canonical={selectedRoute} />
                            {scene.note && (
                              <p className="line-clamp-2 text-xs text-mist-400">{scene.note}</p>
                            )}
                            <SceneMeta scene={scene} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const scene = entry.scenes[0]
                    return (
                      <div key={scene.id} className="relative flex gap-4">
                        <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-dusk-400 ring-4 ring-teal-950" />
                        <div className="w-20 shrink-0 pt-0.5 text-right">
                          <p className="text-xs text-dusk-400">{formatTimestamp(scene.timestamp)}</p>
                          <p className="mt-0.5 text-[10px] text-mist-500">
                            {getTimeOfDay(scene.timestamp)}
                          </p>
                        </div>
                        <button
                          onClick={() => setDetailScene(scene)}
                          className="group flex-1 rounded-xl border border-teal-800 bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            {getWeatherIcon(scene.weather)}
                            <span className="text-sm font-semibold text-mist-100">
                              {scene.segment}
                            </span>
                          </div>
                          <RouteLabel scene={scene} canonical={selectedRoute} />
                          {scene.note && (
                            <p className="line-clamp-2 text-xs text-mist-400">{scene.note}</p>
                          )}
                          <SceneMeta scene={scene} />
                        </button>
                      </div>
                    )
                  })()
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {detailScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailScene(null)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailScene(null)}
              className="absolute right-4 top-4 text-mist-400 transition-colors hover:text-mist-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              {getWeatherIcon(detailScene.weather)}
              <h2 className="text-xl font-bold text-dusk-400">{detailScene.segment}</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{selectedRoute || detailScene.routeName}</span>
                {detailScene.routeName !== selectedRoute && (
                  <span className="rounded bg-dusk-400/10 px-1.5 py-0.5 text-[11px] text-dusk-300">
                    曾用名 {detailScene.routeName}
                  </span>
                )}
                <span className="text-teal-600">·</span>
                <span>{detailScene.seatDirection}侧</span>
              </div>
              <div className="flex items-center gap-2 text-mist-300">
                <Clock className="w-4 h-4 text-dusk-400" />
                <span>{formatTimestamp(detailScene.timestamp)}</span>
                <span className="text-teal-600">·</span>
                <span>{getTimeOfDay(detailScene.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-mist-300">
                {getTreeIcon(detailScene.treeDensity)}
                <span>{detailScene.treeDensity}</span>
                {getPedestrianIcon(detailScene.pedestrianStatus)}
                <span>{detailScene.pedestrianStatus}</span>
              </div>
              {detailScene.signText && (
                <div className="rounded-lg bg-teal-800/50 px-3 py-2 text-mist-200">
                  招牌: {detailScene.signText}
                </div>
              )}
              {detailScene.note && (
                <div className="rounded-lg border border-teal-800 px-3 py-2 text-mist-300">
                  {detailScene.note}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(detailScene.id)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-900/40 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-900/60"
            >
              <Trash2 className="w-4 h-4" />
              删除此窗景
            </button>
          </div>
        </div>
      )}

      {mergeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeMerge}
        >
          <div
            className="relative mx-4 max-h-[85vh] w-full max-w-lg overflow-y-auto animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeMerge}
              className="absolute right-4 top-4 text-mist-400 transition-colors hover:text-mist-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-dusk-400/15">
                <GitMerge className="w-5 h-5 text-dusk-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-dusk-400">合并线路</h2>
                <p className="text-xs text-mist-500">目标名称保留，原名称记作曾用名；记录原样不动</p>
              </div>
            </div>

            <div className="space-y-5 text-sm">
              <div>
                <p className="mb-2 text-xs text-mist-400">第一步 · 选择要合并进来的线路（原名称记为曾用名）</p>
                <div className="flex flex-wrap gap-2">
                  {routeGroups.map((g) => (
                    <button
                      key={g.canonical}
                      onClick={() => {
                        setMergeSource(g.canonical)
                        if (mergeTarget === g.canonical) setMergeTarget('')
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                        mergeSource === g.canonical
                          ? 'bg-dusk-400 text-teal-950'
                          : 'bg-teal-800/70 text-mist-300 hover:bg-teal-800'
                      }`}
                    >
                      {g.canonical}
                      <span className={mergeSource === g.canonical ? 'text-teal-900/70' : 'text-mist-500'}>
                        {' '}· {g.scenes.length} 条
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {mergeSource && (
                <div>
                  <p className="mb-2 text-xs text-mist-400">第二步 · 选择保留名称的目标线路</p>
                  <div className="flex flex-wrap gap-2">
                    {routeGroups
                      .filter((g) => g.canonical !== mergeSource)
                      .map((g) => (
                        <button
                          key={g.canonical}
                          onClick={() => setMergeTarget(g.canonical)}
                          className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                            mergeTarget === g.canonical
                              ? 'bg-dusk-400 text-teal-950'
                              : 'bg-teal-800/70 text-mist-300 hover:bg-teal-800'
                          }`}
                        >
                          {g.canonical}
                          <span className={mergeTarget === g.canonical ? 'text-teal-900/70' : 'text-mist-500'}>
                            {' '}· {g.scenes.length} 条
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {mergePreview && (
                <div className="rounded-xl border border-teal-800 bg-teal-900/60 p-3 text-xs leading-relaxed text-mist-300">
                  <p className="mb-1 flex items-center gap-1.5 text-mist-100">
                    <span className="font-semibold">{mergePreview.source.canonical}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-dusk-400" />
                    <span className="font-semibold text-dusk-300">{mergePreview.target.canonical}</span>
                  </p>
                  <p>
                    合并后共 {mergePreview.source.scenes.length + mergePreview.target.scenes.length} 条记录，
                    原编号、采样时刻与笔记均不改动；
                    {mergePreview.crossPairs > 0
                      ? `其中 ${mergePreview.crossPairs} 对同区间、同朝向且相隔十分钟内的记录将保留两条并挨着排。`
                      : '两边没有十分钟内同区间同朝向的重复采样。'}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeMerge}
                className="flex-1 rounded-lg bg-teal-800/60 py-2.5 text-sm text-mist-300 transition-colors hover:bg-teal-800"
              >
                取消
              </button>
              <button
                onClick={handleConfirmMerge}
                disabled={!mergePreview}
                className="flex-1 rounded-lg bg-dusk-400 py-2.5 text-sm font-medium text-teal-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                确认合并
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
