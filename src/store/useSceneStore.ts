import { create } from 'zustand'
import type { WindowScene, SceneFormData, RouteGroup } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  buildRouteGroups,
  getRandomScene,
} from '@/services/storage'
import { linkRoute } from '@/services/routeRelations'

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  routeGroups: RouteGroup[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null

  loadAll: () => void
  saveScene: (data: SceneFormData) => void
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  /** 记录页：把输入的新线路名挂到已有线路名下（目标名保留，原名记为曾用名） */
  attachRoute: (sourceName: string, targetName: string) => void
  /** 时间线：把两条线路合成一条；返回最终保留的目标名称 */
  mergeRoutes: (sourceName: string, targetName: string) => string
  refreshRandom: () => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  routeNames: [],
  routeGroups: [],
  currentRouteScenes: [],
  selectedRoute: '',
  randomScene: null,

  loadAll: () => {
    const scenes = getAllScenes()
    const routeGroups = buildRouteGroups(scenes)
    const routeNames = routeGroups.map((g) => g.canonical)
    set({
      scenes,
      routeGroups,
      routeNames,
      selectedRoute: get().selectedRoute,
      currentRouteScenes: get().selectedRoute
        ? getScenesByRoute(get().selectedRoute)
        : [],
    })
  },

  saveScene: (data: SceneFormData) => {
    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    storageSaveScene(scene)
    const scenes = getAllScenes()
    const routeGroups = buildRouteGroups(scenes)
    const routeNames = routeGroups.map((g) => g.canonical)
    set((state) => {
      const currentRouteScenes = state.selectedRoute
        ? getScenesByRoute(state.selectedRoute)
        : []
      return { scenes, routeGroups, routeNames, currentRouteScenes }
    })
  },

  deleteScene: (id: string) => {
    storageDeleteScene(id)
    const scenes = getAllScenes()
    const routeGroups = buildRouteGroups(scenes)
    const routeNames = routeGroups.map((g) => g.canonical)
    set((state) => {
      const selectedStillExists =
        !!state.selectedRoute && routeNames.includes(state.selectedRoute)
      const selectedRoute = selectedStillExists ? state.selectedRoute : ''
      const currentRouteScenes = selectedRoute ? getScenesByRoute(selectedRoute) : []
      return { scenes, routeGroups, routeNames, selectedRoute, currentRouteScenes }
    })
  },

  selectRoute: (routeName: string) => {
    const currentRouteScenes = routeName ? getScenesByRoute(routeName) : []
    set({ selectedRoute: routeName, currentRouteScenes })
  },

  attachRoute: (sourceName, targetName) => {
    linkRoute(sourceName.trim(), targetName.trim())
    const scenes = getAllScenes()
    const routeGroups = buildRouteGroups(scenes)
    set({
      scenes,
      routeGroups,
      routeNames: routeGroups.map((g) => g.canonical),
      selectedRoute: targetName,
      currentRouteScenes: getScenesByRoute(targetName),
    })
  },

  mergeRoutes: (sourceName, targetName) => {
    linkRoute(sourceName, targetName)
    const scenes = getAllScenes()
    const routeGroups = buildRouteGroups(scenes)
    set({
      scenes,
      routeGroups,
      routeNames: routeGroups.map((g) => g.canonical),
      selectedRoute: targetName,
      currentRouteScenes: getScenesByRoute(targetName),
    })
    return targetName
  },

  refreshRandom: () => {
    const randomScene = getRandomScene()
    set({ randomScene })
  },
}))
