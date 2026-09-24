export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

export interface WindowScene {
  id: string
  routeName: string
  segment: string
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

export interface SceneFormData {
  routeName: string
  segment: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

/** 归并后的一条线路：目标名称 + 曾用名 + 名下全部原始记录 */
export interface RouteGroup {
  /** 目标名称（归并后保留的线路名） */
  canonical: string
  /** 曾用名（被归并过来的原线路名，仅列出当前仍有记录的） */
  aliases: string[]
  /** 该线路下所有记录（含各曾用名），按采样时间倒序 */
  scenes: WindowScene[]
}

/** 时间线中的单条记录 */
export interface TimelineSingle {
  paired: false
  scenes: [WindowScene]
}

/** 时间线中需要挨着排的两条记录（两边同区间、同朝向、相隔十分钟内） */
export interface TimelinePair {
  paired: true
  scenes: [WindowScene, WindowScene]
}

export type TimelineEntry = TimelineSingle | TimelinePair
