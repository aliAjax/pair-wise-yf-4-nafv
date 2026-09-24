import { useEffect, useMemo, useState } from 'react'
import { Search, Route, X, Trash2, Clock, MapPin, GitMerge, History, Copy } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import { clusterScenes } from '@/utils/routeMerge'
import type { WindowScene } from '@/types'

export default function TimelinePage() {
  const {
    routeNames,
    routeGroups,
    selectedRoute,
    currentRouteScenes,
    selectRoute,
    loadAll,
    deleteScene,
    mergeRoute,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeWith, setMergeWith] = useState('')
  const [keepName, setKeepName] = useState<'target' | 'source'>('target')

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  // 近重复聚簇：同区间、同朝向、10 分钟内的记录成组并挨着排；记录本身不改动
  const clusters = useMemo(
    () => clusterScenes(currentRouteScenes),
    [currentRouteScenes]
  )

  const currentGroup = routeGroups.find((g) => g.canonicalName === selectedRoute)
  const aliases = currentGroup?.aliases ?? []
  const mergeCandidates = routeNames.filter((r) => r !== selectedRoute)

  const openMerge = () => {
    setMergeWith(mergeCandidates[0] ?? '')
    setKeepName('target')
    setMergeOpen(true)
  }

  const handleMerge = () => {
    if (!selectedRoute || !mergeWith) return
    mergeRoute(selectedRoute, mergeWith, keepName === 'target')
    setMergeOpen(false)
  }

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-wide text-dusk-400">
            窗景时间线
          </h1>
          {selectedRoute && routeNames.length > 1 && (
            <button
              onClick={openMerge}
              className="flex items-center gap-1.5 rounded-lg border border-dusk-400/40 bg-dusk-400/10 px-3 py-1.5 text-xs text-dusk-300 transition-colors hover:bg-dusk-400/20"
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
              placeholder="搜索路线..."
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
            {filteredRoutes.map((name) => (
              <button
                key={name}
                onClick={() => selectRoute(name)}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  selectedRoute === name
                    ? 'bg-dusk-400 text-teal-950'
                    : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                }`}
              >
                <Route className="mr-1 inline w-3 h-3" />
                {name}
              </button>
            ))}
          </div>

          {/* 当前线路的曾用名（原名称只作展示，归属已并入目标线路） */}
          {selectedRoute && aliases.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-mist-400">
              <History className="w-3.5 h-3.5 text-dusk-300/70" />
              <span>曾用名：</span>
              {aliases.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-teal-900 px-2 py-0.5 text-[11px] text-mist-300"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {clusters.length === 0 ? (
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
              {clusters.map((cluster) =>
                cluster.map((scene, si) => {
                  const isDup = cluster.length > 1
                  return (
                    <div
                      key={scene.id}
                      className={`relative flex gap-4 ${
                        isDup && si > 0 ? '-mt-3' : ''
                      }`}
                    >
                      <div
                        className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-teal-950 ${
                          isDup ? 'bg-dusk-300 ring-dusk-400/10' : 'bg-dusk-400'
                        }`}
                      />
                      <div className="w-20 shrink-0 pt-0.5 text-right">
                        <p className="text-xs text-dusk-400">
                          {formatTimestamp(scene.timestamp)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-mist-500">
                          {getTimeOfDay(scene.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={() => setDetailScene(scene)}
                        className={`group flex-1 rounded-xl border bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-dusk-400/10 ${
                          isDup
                            ? 'border-dusk-400/50 hover:border-dusk-400/70'
                            : 'border-teal-800 hover:border-dusk-400/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getWeatherIcon(scene.weather)}
                          <span className="text-sm font-semibold text-mist-100">
                            {scene.segment}
                          </span>
                          {isDup && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-dusk-400/15 px-2 py-0.5 text-[10px] text-dusk-300">
                              <Copy className="w-3 h-3" />
                              同区间·同朝向·10分钟内
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-1.5 text-mist-400">
                          <MapPin className="w-3 h-3" />
                          <span className="text-xs">{selectedRoute}</span>
                          {scene.routeName !== selectedRoute && (
                            <span
                              className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-400"
                              title="该记录的原线路名（曾用名），内容未改动"
                            >
                              原名：{scene.routeName}
                            </span>
                          )}
                          <span className="mx-1 text-teal-700">·</span>
                          <span className="text-xs">{scene.seatDirection}侧</span>
                        </div>
                        {scene.note && (
                          <p className="text-xs text-mist-400 line-clamp-2">
                            {scene.note}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          {getTreeIcon(scene.treeDensity)}
                          {getPedestrianIcon(scene.pedestrianStatus)}
                          {scene.signText && (
                            <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
                              {scene.signText}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  )
                })
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
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
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
                {selectedRoute && detailScene.routeName !== selectedRoute && (
                  <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-400">
                    原线路名：{detailScene.routeName}
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

      {/* 合并线路弹窗：只换归属，原编号、采样时刻、笔记均不动 */}
      {mergeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setMergeOpen(false)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMergeOpen(false)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-dusk-400" />
              <h2 className="text-xl font-bold text-dusk-400">合并线路</h2>
            </div>

            {mergeCandidates.length === 0 ? (
              <p className="text-sm text-mist-400">暂无可合并的其他线路。</p>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <label className="mb-1 block text-xs text-mist-300">当前线路</label>
                  <div className="rounded-xl bg-teal-850 px-3 py-2 text-mist-100">
                    {selectedRoute}
                    {aliases.length > 0 && (
                      <span className="ml-2 text-[11px] text-mist-400">
                        （曾用名：{aliases.join('、')}）
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-mist-300">
                    选择要并入的线路
                  </label>
                  <select
                    value={mergeWith}
                    onChange={(e) => setMergeWith(e.target.value)}
                    className="w-full rounded-xl bg-teal-850 px-3 py-2 text-mist-100 outline-none focus:ring-1 focus:ring-dusk-400"
                  >
                    {mergeCandidates.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-mist-300">合并后保留的名称</label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setKeepName('target')}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        keepName === 'target'
                          ? 'border-dusk-400 bg-dusk-400/15 text-dusk-300'
                          : 'border-teal-800 bg-teal-850 text-mist-300'
                      }`}
                    >
                      保留「{selectedRoute}」，「{mergeWith}」记为曾用名
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeepName('source')}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        keepName === 'source'
                          ? 'border-dusk-400 bg-dusk-400/15 text-dusk-300'
                          : 'border-teal-800 bg-teal-850 text-mist-300'
                      }`}
                    >
                      保留「{mergeWith}」，「{selectedRoute}」记为曾用名
                    </button>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed text-mist-400">
                  合并只调整线路归属：原编号、采样时刻、笔记都不会改动；
                  同区间、同朝向且相隔十分钟内的两条记录会都保留并挨着排。
                </p>

                <button
                  onClick={handleMerge}
                  disabled={!mergeWith}
                  className="w-full rounded-xl bg-dusk-400 py-2.5 text-sm font-medium text-teal-950 transition hover:bg-dusk-300 disabled:opacity-40"
                >
                  确认合并
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
