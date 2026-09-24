import { create } from 'zustand'
import type { WindowScene, SceneFormData, RouteGroup } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getRandomScene,
} from '@/services/storage'
import {
  getAllRouteGroups,
  attachRouteAlias,
  mergeRoutes as storageMergeRoutes,
} from '@/services/routeGroups'
import { listCanonicalRoutes, filterScenesOfRoute } from '@/utils/routeMerge'

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  routeGroups: RouteGroup[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null

  loadAll: () => void
  saveScene: (data: SceneFormData, attachTo?: string) => void
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  attachRoute: (targetName: string, aliasName: string) => void
  mergeRoute: (targetName: string, sourceName: string, keepTargetName: boolean) => void
  refreshRandom: () => void
}

/** 由原始记录 + 归并表推导当前选中线路的记录（旧记录保持原样，筛选时解析归属） */
function deriveRouteScenes(
  scenes: WindowScene[],
  groups: RouteGroup[],
  selectedRoute: string
): WindowScene[] {
  if (!selectedRoute) return []
  return filterScenesOfRoute(scenes, groups, selectedRoute)
}

export const useSceneStore = create<SceneState>((set) => ({
  scenes: [],
  routeNames: [],
  routeGroups: [],
  currentRouteScenes: [],
  selectedRoute: '',
  randomScene: null,

  loadAll: () => {
    const scenes = getAllScenes()
    const routeGroups = getAllRouteGroups()
    const routeNames = listCanonicalRoutes(scenes, routeGroups)
    set((state) => ({
      scenes,
      routeGroups,
      routeNames,
      currentRouteScenes: deriveRouteScenes(scenes, routeGroups, state.selectedRoute),
    }))
  },

  saveScene: (data, attachTo) => {
    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    let routeGroups = getAllRouteGroups()
    // 记录页"挂到已有线路"：新名称作为目标线路的曾用名，记录仍写新名称
    if (attachTo && attachTo.trim() && attachTo.trim() !== data.routeName.trim()) {
      routeGroups = attachRouteAlias(attachTo, data.routeName)
    }
    storageSaveScene(scene)
    const scenes = getAllScenes()
    const routeNames = listCanonicalRoutes(scenes, routeGroups)
    set((state) => ({
      scenes,
      routeGroups,
      routeNames,
      currentRouteScenes: deriveRouteScenes(scenes, routeGroups, state.selectedRoute),
    }))
  },

  deleteScene: (id) => {
    storageDeleteScene(id)
    const scenes = getAllScenes()
    const routeGroups = getAllRouteGroups()
    const routeNames = listCanonicalRoutes(scenes, routeGroups)
    set((state) => ({
      scenes,
      routeGroups,
      routeNames,
      currentRouteScenes: deriveRouteScenes(scenes, routeGroups, state.selectedRoute),
    }))
  },

  selectRoute: (routeName) => {
    set((state) => ({
      selectedRoute: routeName,
      currentRouteScenes: deriveRouteScenes(
        state.scenes,
        state.routeGroups,
        routeName
      ),
    }))
  },

  attachRoute: (targetName, aliasName) => {
    const routeGroups = attachRouteAlias(targetName, aliasName)
    const scenes = getAllScenes()
    const routeNames = listCanonicalRoutes(scenes, routeGroups)
    set((state) => {
      // 若用户正浏览被挂入的旧线路，跳到目标线路
      const selected =
        state.selectedRoute && state.selectedRoute !== targetName
          ? (() => {
              const g = routeGroups.find(
                (grp) =>
                  grp.canonicalName === state.selectedRoute ||
                  grp.aliases.includes(state.selectedRoute)
              )
              return g ? targetName : state.selectedRoute
            })()
          : state.selectedRoute
      return {
        routeGroups,
        routeNames,
        selectedRoute: selected,
        currentRouteScenes: deriveRouteScenes(scenes, routeGroups, selected),
      }
    })
  },

  mergeRoute: (targetName, sourceName, keepTargetName) => {
    const routeGroups = storageMergeRoutes(targetName, sourceName, keepTargetName)
    const scenes = getAllScenes()
    const routeNames = listCanonicalRoutes(scenes, routeGroups)
    // 合并后只保留目标名称：保留谁，选中态就落在谁上
    const keptName = keepTargetName ? targetName : sourceName
    set({
      routeGroups,
      routeNames,
      selectedRoute: keptName,
      currentRouteScenes: deriveRouteScenes(scenes, routeGroups, keptName),
    })
  },

  refreshRandom: () => {
    const randomScene = getRandomScene()
    set({ randomScene })
  },
}))
