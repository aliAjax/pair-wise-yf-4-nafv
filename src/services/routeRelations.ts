import type { RouteGroup, WindowScene } from '@/types'

/**
 * 线路关系层：只维护「原名称 → 目标名称」的归属映射。
 * 场景记录本身的 routeName 永不改写，归并只换归属。
 *
 * 单独存放在 localStorage 的 bus_route_relations 键，
 * 与窗景记录（bus_window_scenes）互不影响。
 */
const RELATION_KEY = 'bus_route_relations'

type AliasMap = Record<string, string>

function readMap(): AliasMap {
  try {
    const raw = localStorage.getItem(RELATION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as AliasMap) : {}
  } catch {
    return {}
  }
}

function writeMap(map: AliasMap): void {
  localStorage.setItem(RELATION_KEY, JSON.stringify(map))
}

/** 沿归属链解析出目标名称（兼容历史数据里可能出现的多级指向） */
export function resolveCanonicalName(name: string, map: AliasMap = readMap()): string {
  const seen = new Set<string>()
  let current = name
  while (map[current] && map[current] !== current && !seen.has(current)) {
    seen.add(current)
    current = map[current]
  }
  return current
}

/**
 * 把线路 source 挂到 target 名下：target 名称保留，source 记作 target 的曾用名。
 * 合并只改归属关系，不改动任何场景记录。
 */
export function linkRoute(source: string, target: string): void {
  if (!source || !target || source === target) return
  const map = readMap()

  // source 此前若已挂在别的线路名下，其整组曾用名一起平移到 target
  const sourceRoot = resolveCanonicalName(source, map)
  const reparent: Array<[string, string]> = []
  for (const key of Object.keys(map)) {
    if (resolveCanonicalName(key, map) === sourceRoot) {
      reparent.push([key, target])
    }
  }
  for (const [key, value] of reparent) {
    map[key] = value
  }
  map[source] = target
  writeMap(map)
}

export interface RouteRelations {
  map: AliasMap
  resolve: (name: string) => string
}

export function getRouteRelations(): RouteRelations {
  const map = readMap()
  return { map, resolve: (name) => resolveCanonicalName(name, map) }
}

/**
 * 依据原始记录和归属关系，归并出线路分组。
 * 曾用名只保留当前仍有记录的；没有记录的线路不出现。
 */
export function buildRouteGroups(
  scenes: WindowScene[],
  relations: RouteRelations = getRouteRelations(),
): RouteGroup[] {
  const { resolve } = relations
  const groupsMap = new Map<string, { aliases: Set<string>; scenes: WindowScene[] }>()

  for (const scene of scenes) {
    const canonical = resolve(scene.routeName)
    let group = groupsMap.get(canonical)
    if (!group) {
      group = { aliases: new Set(), scenes: [] }
      groupsMap.set(canonical, group)
    }
    group.scenes.push(scene)
    if (scene.routeName !== canonical) {
      group.aliases.add(scene.routeName)
    }
  }

  return Array.from(groupsMap.entries())
    .map(([canonical, { aliases, scenes: groupScenes }]) => ({
      canonical,
      aliases: Array.from(aliases).sort(),
      scenes: groupScenes.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical, 'zh-Hans-CN'))
}
