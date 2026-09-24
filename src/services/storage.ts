import type { WindowScene } from '@/types'
import { buildRouteGroups, resolveCanonicalName } from './routeRelations'

const STORAGE_KEY = 'bus_window_scenes'

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WindowScene[]
  } catch {
    return []
  }
}

export function saveScene(scene: WindowScene): void {
  const scenes = getAllScenes()
  scenes.push(scene)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function deleteScene(id: string): void {
  const scenes = getAllScenes().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

/**
 * 按线路筛选：线路名按归并关系解析为目标名称后比较，
 * 因此「21路 / 21路区间 / 二十一路」归并后会作为同一条线路返回。
 * 记录本身的 routeName 保持原值不动。
 */
export function getScenesByRoute(routeName: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => resolveCanonicalName(s.routeName) === routeName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/** 归并后的全部线路名（目标名称） */
export function getAllRouteNames(): string[] {
  return buildRouteGroups(getAllScenes()).map((g) => g.canonical)
}

export { buildRouteGroups }

export function getRandomScene(): WindowScene | null {
  const scenes = getAllScenes()
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}
