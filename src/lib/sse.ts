import { ref, computed, watch, shallowRef, type Ref, reactive } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'
import { useEventListener } from '@vueuse/core'

export type UseEventSourceOptions = EventSourceInit

/**
 * Reactive wrapper for EventSource / Mercure.
 *
 * @see https://vueuse.org/useEventSource
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource EventSource
 * @param url
 * @param events
 * @param options
 */
export function useMercureEventSource(url: string | URL, events: Array<string> = [], options: UseEventSourceOptions = {}) {
  
    const dataFieldsValues: Ref<any[] | null> = ref(null)

    const lastEventId: Ref<string> = ref('')


    const event: Ref<string | null> = ref(null)
    const data: Ref<string | null> = ref(null)

    const status = ref('CONNECTING') as Ref<'OPEN' | 'CONNECTING' | 'CLOSED'>
  
    const eventSource = ref(null) as Ref<EventSource | null>
    const error = shallowRef(null) as Ref<Event | null>

  const history: Ref<string[]> = ref([])

  const ecount = ref(0)

  const {
    withCredentials = false,
  } = options

  const close = () => {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
      status.value = 'CLOSED'
    }
  }

  const jsparse = (str: string) => {
    try {
        return [null, JSON.parse(str)]
    } catch (ex) {
        return [null]
    }
  }

  const es = new EventSource(url, { withCredentials })

  eventSource.value = es

  es.onopen = () => {
    status.value = 'OPEN'
    error.value = null
  }

  es.onerror = (e) => {
    status.value = 'CLOSED'
    error.value = e
  }

  es.onmessage = (e: MessageEvent) => {
    //console.log('message: ', e)
    event.value = null
    data.value = e.data

    //  process all lines of 'data' fields
    const datavals: string[] = e.data.split("\n")

    const buffer: any[] = []
    datavals.map((value) => {
        const [err, linejs] = jsparse(value)
        if (err) {
            console.log('recv data field is not json: ', value)
        } else {
            buffer.push(linejs)
        }
    })
    dataFieldsValues.value = buffer

    lastEventId.value = e.lastEventId
  }

  for (const event_name of events) {
    useEventListener(es, event_name, (e: Event & { data?: string }) => {
      event.value = event_name
      data.value = e.data || null
    })
  }

  tryOnScopeDispose(() => {
    close()
  })

  return {
    dataFieldsValues, lastEventId,
    //  and...
    eventSource,
    event,
    data,
    history,
    ecount,
    status,
    error,
    close,
  }
}

export type UseMercureEventSourceReturn = ReturnType<typeof useMercureEventSource>