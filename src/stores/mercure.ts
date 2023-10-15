import { ref, shallowRef, computed, type Ref, type ShallowRef, watch, toRefs } from 'vue'
import { defineStore } from 'pinia'
import { make, makeSubject, type Source } from 'wonka'
import { useMercure } from '@/lib/sse'
import { MERCURE_TOPICS_PREFIX, MERCURE_WELL_KNOWN } from '@/config/api'

export type MercureStoreEvent = {

    lastEventID: string;

    apiEventType: string;

    apiResourceID: string;
}

export const useMercureStore = defineStore('mercure', () => {

    const nth = (a: string[]) => (n: number) => {
        return a[Math.min(a.length, n) - 1]
    }

    const available: Map<string, Source<MercureStoreEvent>> = new Map()

    const src$ = make<MercureStoreEvent>(({ next, complete }) => {

        //  
        const merc = useMercure(MERCURE_WELL_KNOWN + '?topic=' + MERCURE_TOPICS_PREFIX + '/posts/{id}', {}, {
          retry_baseline_fn: nth(['1s', '2s', 'infinity'])
        })

        const { lastEventID, eventType, firstDataField } = toRefs(merc)

        watch(lastEventID, () => {
            next({
                lastEventID: lastEventID.value,
                apiEventType: eventType.value,
                apiResourceID: firstDataField.value['@id']
            })
        })

        return () => {
            console.log('teardown fn exec')
        }
    })

    const forTopic = computed(() => (topic: string) => {

        if (available.has(topic)) {
            return available.get(topic)!
        }

        available.set(topic, make<MercureStoreEvent>(({ next, complete }) => {

            //  
            const merc = useMercure(MERCURE_WELL_KNOWN + '?topic=' + topic, {}, {
              retry_baseline_fn: nth(['1s', '2s', 'infinity'])
            })
    
            const { lastEventID, eventType, firstDataField } = toRefs(merc)
    
            watch(lastEventID, () => {
                next({
                    lastEventID: lastEventID.value,
                    apiEventType: eventType.value,
                    apiResourceID: firstDataField.value['@id']
                })
            })
    
            return () => {
                console.log('teardown fn exec')
            }
        }))

        return available.get(topic)!
    })

    const source = computed(() => {
        return src$
    })

    return { source, forTopic }
})
