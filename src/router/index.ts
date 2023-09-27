import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/ordered',
      name: 'ordered',
      component: () => import('../views/OrderedHomeView.vue')
    },
    {
      path: '/table',
      name: 'table',
      component: () => import('../views/TabularHomeView.vue')
    },
    {
      path: '/sse',
      name: 'sse',
      component: () => import('../views/SSEView.vue')
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
    }
  ]
})

export default router
