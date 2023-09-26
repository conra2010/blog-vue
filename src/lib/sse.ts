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

    const eventType: Ref<string> = ref('message')

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

  function datavals(e: MessageEvent<any>): string[] {
    return e.data.split("\n")
  }

  function jslift(dvals: string[]): any[] {
    const rx: any[] = []
    dvals.map((value) => {
        const [err, linejs] = jsparse(value)
        if (err) {
            console.log('recv data field is not json: ', value)
        } else {
            rx.push(linejs)
        }
    })
    return rx
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

  function pre(e: MessageEvent<any>) {
    //  ?????
    event.value = null
    data.value = e.data

    eventType.value = e.type
    lastEventId.value = e.lastEventId
  }

  es.addEventListener('create', (e) => {
    console.log('create: ', e.data)

    pre(e)
    //  eventType.value = 'create'
    dataFieldsValues.value = jslift(datavals(e))
  })

  es.addEventListener('update', (e) => {
    console.log('update: ', e.data)
  })

  es.addEventListener('delete', (e) => {
    console.log('delete: ', e.data)
  })

  es.onmessage = (e: MessageEvent) => {
    console.log('message: ', e)

    pre(e)
    //
    dataFieldsValues.value = datavals(e)
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
    dataFieldsValues, lastEventId, eventType,
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