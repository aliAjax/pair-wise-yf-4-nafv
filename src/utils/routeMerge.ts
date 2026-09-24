import type { TimelineEntry, WindowScene } from '@/types'

/** 相隔十分钟内（含十分钟），才允许并排保留 */
export const PAIR_WINDOW_MS = 10 * 60 * 1000

function normalizeSegment(segment: string): string {
  return segment.trim().replace(/\s+/g, '')
}

/**
 * 两条记录是否构成「并排」候选：
 * 必须分属合并前的两边（原线路名不同）、同区间、同座位朝向、采样时刻相隔十分钟内。
 */
export function isPairCandidate(a: WindowScene, b: WindowScene): boolean {
  if (a.routeName === b.routeName) return false
  if (a.seatDirection !== b.seatDirection) return false
  if (normalizeSegment(a.segment) !== normalizeSegment(b.segment)) return false
  const diff = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  return diff <= PAIR_WINDOW_MS
}

/**
 * 贪心配对：全局挑选相隔时间最短的候选对，直至没有候选。
 * 每条记录最多进入一个配对，来自同一原线路（同一边）的记录不互配。
 */
export function matchPairedScenes(scenes: WindowScene[]): Map<string, string> {
  const matched = new Map<string, string>()
  const used = new Set<string>()

  const candidates: Array<{ a: WindowScene; b: WindowScene; diff: number }> = []
  for (let i = 0; i < scenes.length; i++) {
    for (let j = i + 1; j < scenes.length; j++) {
      if (isPairCandidate(scenes[i], scenes[j])) {
        candidates.push({
          a: scenes[i],
          b: scenes[j],
          diff: Math.abs(
            new Date(scenes[i].timestamp).getTime() - new Date(scenes[j].timestamp).getTime(),
          ),
        })
      }
    }
  }
  candidates.sort(
    (x, y) =>
      x.diff - y.diff ||
      new Date(y.a.timestamp).getTime() - new Date(x.a.timestamp).getTime() ||
      y.a.id.localeCompare(x.a.id),
  )

  for (const { a, b } of candidates) {
    if (used.has(a.id) || used.has(b.id)) continue
    used.add(a.id)
    used.add(b.id)
    matched.set(a.id, b.id)
    matched.set(b.id, a.id)
  }

  return matched
}

/**
 * 把一条归并线路下的记录编排成时间线：
 * 普通记录单独成条；配对的两条挨着排，并定位在较晚一次采样的位置
 * （中间不会插入其他记录）。整体仍按时间倒序。
 */
export function buildTimelineEntries(scenes: WindowScene[]): TimelineEntry[] {
  const pairs = matchPairedScenes(scenes)
  const byId = new Map(scenes.map((s) => [s.id, s]))
  const rendered = new Set<string>()

  const sorted = [...scenes].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ||
      a.id.localeCompare(b.id),
  )

  const entries: TimelineEntry[] = []
  for (const scene of sorted) {
    if (rendered.has(scene.id)) continue

    const partnerId = pairs.get(scene.id)
    if (partnerId) {
      const partner = byId.get(partnerId)
      if (partner) {
        rendered.add(scene.id)
        rendered.add(partner.id)
        // 当前迭代位置是较晚记录，另一条紧随其后
        entries.push({
          paired: true,
          scenes: [scene, partner],
        })
        continue
      }
    }

    rendered.add(scene.id)
    entries.push({ paired: false, scenes: [scene] })
  }

  return entries
}
