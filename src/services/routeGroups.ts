import type { RouteGroup } from '@/types'

const STORAGE_KEY = 'bus_window_route_groups'

/** 名称规范化：去掉所有空白（中文线路名不含合法空格，"21 路" 视作 "21路"） */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, '')
}

export function getAllRouteGroups(): RouteGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RouteGroup[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((g) => g && typeof g.canonicalName === 'string')
      .map((g) => ({
        id: g.id,
        canonicalName: normalizeName(g.canonicalName),
        aliases: Array.isArray(g.aliases)
          ? g.aliases.map(normalizeName).filter(Boolean)
          : [],
      }))
  } catch {
    return []
  }
}

function saveAll(groups: RouteGroup[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
}

function findGroupIndex(groups: RouteGroup[], name: string): number {
  const key = normalizeName(name)
  return groups.findIndex(
    (g) => g.canonicalName === key || g.aliases.includes(key)
  )
}

/**
 * 把名称 aliasName 挂到目标线路 targetName 上（记录页入口）。
 * - aliasName 已属于 targetName：幂等无操作
 * - aliasName 本身是另一条线路（含其曾用名）：该整组并入目标
 * - targetName 此前没有组：自动建组
 * 返回更新后的全部归并组。
 */
export function attachRouteAlias(
  targetName: string,
  aliasName: string
): RouteGroup[] {
  const target = normalizeName(targetName)
  const alias = normalizeName(aliasName)
  if (!target || !alias || target === alias) return getAllRouteGroups()

  const groups = getAllRouteGroups()
  const targetIdx = findGroupIndex(groups, target)
  const aliasIdx = findGroupIndex(groups, alias)

  if (aliasIdx !== -1 && aliasIdx === targetIdx) return groups

  // 目标组不存在则新建
  if (targetIdx === -1) {
    groups.push({ id: crypto.randomUUID(), canonicalName: target, aliases: [] })
  }
  // 重新取索引（可能刚 push）
  const tIdx = findGroupIndex(groups, target)
  const targetGroup = groups[tIdx]
  const aIdx = findGroupIndex(groups, alias)

  if (aIdx === -1) {
    // 全新名称，直接记为曾用名
    if (!targetGroup.aliases.includes(alias)) targetGroup.aliases.push(alias)
  } else if (aIdx !== tIdx) {
    // 挂入的名称属于另一条整组：组合并，目标名称保留
    const sourceGroup = groups[aIdx]
    const namesToMove = [sourceGroup.canonicalName, ...sourceGroup.aliases].filter(
      (n) => n !== target
    )
    for (const n of namesToMove) {
      if (!targetGroup.aliases.includes(n)) targetGroup.aliases.push(n)
    }
    groups.splice(aIdx, 1)
  }

  saveAll(groups)
  return groups
}

/**
 * 合并两条线路（时间线页入口）。
 * keepTargetName=true 保留 targetName，sourceName 整体并入并记为曾用名；
 * keepTargetName=false 保留 sourceName（反向并入）。
 */
export function mergeRoutes(
  targetName: string,
  sourceName: string,
  keepTargetName = true
): RouteGroup[] {
  return keepTargetName
    ? attachRouteAlias(targetName, sourceName)
    : attachRouteAlias(sourceName, targetName)
}

/** 解析某条原始名称所属线路的目标名称；无归并关系时返回其自身 */
export function resolveCanonicalName(
  name: string,
  groups: RouteGroup[]
): string {
  const key = normalizeName(name)
  const g = groups.find(
    (grp) => grp.canonicalName === key || grp.aliases.includes(key)
  )
  return g ? g.canonicalName : key
}

/** 取某条线路的曾用名（无归并组时为空） */
export function getRouteAliases(
  canonicalName: string,
  groups: RouteGroup[]
): string[] {
  const key = normalizeName(canonicalName)
  return groups.find((g) => g.canonicalName === key)?.aliases ?? []
}
