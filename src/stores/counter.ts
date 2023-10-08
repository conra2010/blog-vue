import { ref, computed, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { makeSubject, type Source } from 'wonka'

export const useCounterStore = defineStore('counter', () => {
  const { source: retry$, next: nextRetryString }= makeSubject<string>()
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { retry$, nextRetryString, count, doubleCount, increment }
})
