import { ref, shallowRef, computed, type Ref, type ShallowRef } from 'vue'
import { defineStore } from 'pinia'
import { makeSubject, type Source } from 'wonka'
import mitt, { type Emitter } from 'mitt'
import type { MercureSourceEvents } from '@/lib/sse'

export const useSignalsStore = defineStore('signals', () => {

    const emitter: Emitter<MercureSourceEvents> = mitt<MercureSourceEvents>()

    const sig = ref(true)

    const signals: Map<number, ShallowRef<boolean>> = new Map<number, ShallowRef<boolean>>()

    const signal = computed(() => (key: number) => {
        if (signals.get(key)) {
            return signals.get(key)
        }

        signals.set(key, shallowRef(false))
        return signals.get(key)
    })

    const unlink = computed(() => (key: number) => {
        return signals.delete(key)
    })

    return { emitter, sig, signal, unlink }
})
