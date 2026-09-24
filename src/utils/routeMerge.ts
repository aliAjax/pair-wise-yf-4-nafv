import type { WindowScene, RouteGroup } from '@/types'
import { normalizeName, resolveCanonicalName } from '@/services/routeGroups'

/**
 * 同区间：规范化后比较——忽略空白、大小写，并统一常见连接符写法
 * （"中山门—解放路" 与 "中山门-解放路" 视为同区间）
 */
export function isSameSegment(a: string, b: string): boolean {
  const norm = (s: string) =>
    normalizeName(s)
      .toLowerCase()
      .replace(/[—–－\-~～至到]+/g, '—')
  return norm(a) === norm(b)
}

/** 两条记录是否为"同区间、同朝向且相隔十分钟内" */
export function isNearDuplicate(a: WindowScene, b: WindowScene): boolean {
  if (!isSameSegment(a.segment, b.segment)) return false
  if (a.seatDirection !== b.seatDirection) return false
  const diff = Math.abs(
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  return diff <= 10 * 60 * 1000
}

/**
 * 把一条目标线路下的记录按近重复关系聚簇。
 * 近重复的两条（同区间、同朝向、10 分钟内）归为同一簇并排相邻，
 * 其余记录各自成簇。簇按组内最新采样时间倒序，组内按采样时间正序。
 *
 * 注意：只调整排列，不修改任何记录。
 */
export function clusterScenes(scenes: WindowScene[]): WindowScene[][] {
  const sorted = [...scenes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const clusters: WindowScene[][] = []
  for (const scene of sorted) {
    let placed = false
    for (const cluster of clusters) {
      // 与簇内任一记录构成近重复即同簇（时间已升序，10 分钟天然挨着）
      if (cluster.some((member) => isNearDuplicate(member, scene))) {
        cluster.push(scene)
        placed = true
        break
      }
    }
    if (!placed) clusters.push([scene])
  }

  return clusters.sort((a, b) => {
    const latestA = Math.max(...a.map((s) => new Date(s.timestamp).getTime()))
    const latestB = Math.max(...b.map((s) => new Date(s.timestamp).getTime()))
    return latestB - latestA
  })
}

/** 归并视角下的全部线路（目标名称），按名称排序 */
export function listCanonicalRoutes(
  scenes: WindowScene[],
  groups: RouteGroup[]
): string[] {
  const set = new Set(
    scenes.map((s) => resolveCanonicalName(s.routeName, groups))
  )
  for (const g of groups) set.add(g.canonicalName)
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}

/**
 * 按归并关系筛选记录：
 * 原始名称等于目标名称、或是目标线路的曾用名，都算同一条线路。
 * 旧记录的 routeName 保持原样，归属在筛选时解析。
 */
export function filterScenesOfRoute(
  scenes: WindowScene[],
  groups: RouteGroup[],
  canonicalName: string
): WindowScene[] {
  const target = normalizeName(canonicalName)
  const group = groups.find((g) => g.canonicalName === target)
  const accepted = new Set(
    group ? [group.canonicalName, ...group.aliases] : [target]
  )
  return scenes.filter((s) => accepted.has(normalizeName(s.routeName)))
}
