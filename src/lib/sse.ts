import { ref, computed, watch, shallowRef, type Ref, reactive, inject } from 'vue'
import { refDebounced, tryOnScopeDispose, useRefHistory, watchDebounced } from '@vueuse/core'
import { useEventListener, useWebWorkerFn } from '@vueuse/core'
import { v4 as uuidv4 } from 'uuid'

import { useNetwork, useDateFormat } from '@vueuse/core'

import { Duration } from '@icholy/duration'

import * as _ from 'lodash'

export type MercureSourceEvents = {
  foo: string;
}

export type UseEventSourceOptions = EventSourceInit

/**
 * An event source for the Mercure Hub
 * 
 */
export interface MercureSource {
  /**
   * Last received event ID
   */
  lastEventID: string;
  /**
   * Last received event type
   */
  eventType: string;
  /**
   * Event data: lines parsed as JSON
   */
  dataFieldsValues: any[] | null;
  /**
   * Testing 'computed' for easy access
   */
  firstDataField: any | null;
  /**
   * This event source ID
   */
  urn: string;
  /**
   * GraphQL Mercure subscription ID
   */
  gqlSubscriptionID: string;
  /**
   * The status of the event source
   */
  status: string;
  /**
   * The actual event source
   */
  eventSource: EventSource | null;
  /**
   * Error signaling
   */
  error: Event | null;
  //  to debug
  lastEventIDOnError: string;
  //  testing
  severity: string;
  //  teardown
  close: any;
}

export interface UseMercureConfiguration {
  /**
   * will try to reconnect at baseline + rng span
   */
  retry_rng_span?: number;
  /**
   * The 'duration' of the waiting time before the n-th retry
   * 
   * With 'infinity' there'll be no more retries. Use 'ms' for
   * milliseconds, 's' for seconds, etc. See 'Duration'
   *
   * Examples:
   *  ['1s','5s','2m','infinity'] indexed using n
   * 
   * @param   {number}  n  number of retry, starts at 1
   *
   * @return  {string}     the waiting time as a duration
   */
  retry_baseline_fn?: (n: number) => string
}

export function useMercure(url: string, options: UseEventSourceOptions = {}, configuration?: UseMercureConfiguration): MercureSource {
  
  //  data about the event received
  const lastEventID: Ref<string> = ref('')

  const eventType: Ref<string> = ref('')

  //  can get several 'data:' fields for the same event
  const dataFieldsValues: Ref<any[] | null> = ref(null)
  //  the first one
  const firstDataField = computed(() => {
    if (dataFieldsValues.value !== null) {
      return dataFieldsValues.value[0]
    }
    
    return null
  })

  //  status and event source
  const status: Ref<string> = ref('CLOSED')

  const eventSource: Ref<EventSource | null> = ref(null)

  //  debug, shows last n values of status
  const status_history = useRefHistory(status, { capacity: 5 })
  //  log status changes
  watch(status, () => {
    const hist = status_history.history.value
    console.log(logid.value, ' status history <<< ', JSON.stringify(status_history.history.value.map((x) => x.snapshot)))
  })
  
  //  ID this Mercure source function
  const urn: string = `sse:${uuidv4()}`

  const s24 = (x: string) => { return _.truncate(x, {length:24}) }

  //  GraphQL subscription ID taken from the Mercure URL
  const gqlSubscriptionID: Ref<string> = ref('')

  //  error
  const error: Ref<Event|null> = ref(null)

  //  keep last known event ID to try to recover lost events when reconnecting
  const lastEventIDOnError: Ref<string> = ref('')

  //  giving up retrying
  const severity: Ref<string> = ref('')

  //  configuration: retry up to # times with waiting times of baseline * fx + rng span
  function _retry_baseline_default_fn(n: number): string {
    //  defaults to no retries
    return 'infinity'
  }

  const _retry_timeout_fn: (n: number) => string = (configuration?.retry_baseline_fn ?? _retry_baseline_default_fn)

  const _retry_rng_span: number = (configuration?.retry_rng_span ?? 300)

  //  reconnect with lastEventID
  let _timer: number;

  let _ntries: number = 0;

  //  debugging Mercure disconnections, matches the config option in the server
  let _lastErrorTimeStamp: number;

  //  network status
  const { isOnline, onlineAt, offlineAt } = useNetwork()

  watchDebounced(isOnline, () => {
    if (!isOnline.value) {
      //  went offline
      console.log('useMercure : network is now offline : ', useDateFormat(offlineAt.value, 'YYYY-MM-DD HH:mm:ss SSS').value)
      close()
      //  will reset the # of retries for a fresh start when getting back online
      _ntries = 0
    } else {
      //  went online
      console.log('useMercure : network is now online : ', useDateFormat(onlineAt.value, 'YYYY-MM-DD HH:mm:ss SSS').value)
      reconnect()
    }
    //  getting quite a few notifications
  }, { debounce: 1000, maxWait: 5000 })

  //  logging, an ID for log entries
  const logid = computed(() => {
    if (gqlSubscriptionID.value !== '') {
      return `${_.truncate(urn,{length:16})} sub:${_.truncate(gqlSubscriptionID.value,{length:16})}`
    } else {
      return urn
    }
  })

  /**
   * adds the known last event ID to the URL for
   * Mercure to get us up to speed on events since
   *
   * @return  {string}  the URL to reconnect to
   */
  function reconnectURL(): string {
    let rx = url;

    if (lastEventID.value !== '') {
      if (rx.indexOf('?') === -1) {
        rx += '?';
      } else {
        rx += '&';
      }
      rx += 'lastEventID=' + encodeURIComponent(lastEventID.value);
    }

    return rx
  }

  //  shared for all event types, save some stuff
  function pre(e: MessageEvent<any>) {
    //  ?????
    eventType.value = e.type
    lastEventID.value = e.lastEventId
  }

  //  parsing 'data:' into JSON
  const jsparse = (str: string) => {
    try {
      return [null, JSON.parse(str)]
    } catch (ex) {
      return [ex, null]
    }
  }

  //  see event source spec
  function datavals(e: MessageEvent<any>): string[] {
    return e.data.split("\n")
  }

  //  data: as JSON[]
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

  //  init event source
  const {
    withCredentials = false,
  } = options

  //  parse a duration spec string into ms
  const duration = (spec: string): [any, any] => {
    try {
      const dx = new Duration(spec)
      return [null, dx.milliseconds()]
    } catch (ex) {
      return [ex, null]
    }
  }

  //  tries to reconnect the event source
  function reconnect() {

    _ntries++
  
    // reconnect after random timeout
    const spec = _retry_timeout_fn(_ntries)
    console.log(logid.value, 'retry # ', _ntries, ' with spec ', spec)

    if (spec !== 'infinity') {
      severity.value = 'RETRYING'
      //  parse duration
      const [ex, dx] = duration(spec)
      if (ex) {
        console.log(logid.value, 'Failed parsing configuration timeout: ', spec)
        severity.value = 'SEVERE'
      } else {
        console.log(logid.value, 'Dx ', dx)

        const timeout = Math.round(dx + _retry_rng_span * Math.random());
        console.log(logid.value, 'Will reconnect in approx ', new Duration(timeout).toString(), ' for lastEventID ', (lastEventID.value !== '' ? lastEventID.value : '(undefined)'))

        _timer = setTimeout(() => {
          console.log(logid.value, ' new EventSource ')
          //  a new event source
          eventSource.value = new EventSource(reconnectURL(), { withCredentials })
        }, timeout);
      }
    } else {
      console.log(logid.value, 'Max retries reached with lastEventID ', (lastEventID.value !== '' ? lastEventID.value : '(undefined)'))
      severity.value = 'SEVERE'
    }
  }

  //  setup event source listeners
  watch(eventSource, () => {
    if (eventSource.value) {
      //  management
      eventSource.value.onopen = () => {
        status.value = 'OPEN'
        error.value = null
        severity.value = ''

        //  reference value for disconnections
        _lastErrorTimeStamp = performance.now()

        //  reset retry count
        _ntries = 0;
        console.log(logid.value, 'resets # tries on open')
      }

      //  reconnect on error
      eventSource.value.onerror = (e) => {
        //  debugging Mercure disconnects (config option)
        const mark = performance.now()
        
        const split = (mark - _lastErrorTimeStamp)

        console.log(logid.value, ' error split: ', split / 1000 / 60, ' minutes')

        //  reference
        _lastErrorTimeStamp = mark

        //  will try to recover from error
        error.value = e
        lastEventIDOnError.value = lastEventID.value
        severity.value = 'UNKNOWN'

        console.log(logid.value, ' error, closing connection...')

        //  cleanup first
        close()

        //  try
        reconnect()
      }

      //  generic 'message' type
      eventSource.value.onmessage = (e: MessageEvent) => {
        pre(e)
        //
        dataFieldsValues.value = datavals(e)
      }
      //  API Platform 'create', 'update' and 'delete' messages
      eventSource.value.addEventListener('create', (e) => {
        //console.log('create: ', e.data)
        pre(e)
        //
        dataFieldsValues.value = jslift(datavals(e))
      })
      eventSource.value.addEventListener('update', (e) => {
        //console.log('update: ', e.data)
        pre(e)
        //
        dataFieldsValues.value = jslift(datavals(e))
      })
      eventSource.value.addEventListener('delete', (e) => {
        //console.log('delete: ', e.data)
        pre(e)
        //
        dataFieldsValues.value = jslift(datavals(e))
      })
      eventSource.value.addEventListener('gqlsubs', (e) => {
        //
        pre(e)
        //
        dataFieldsValues.value = jslift(datavals(e))

        console.log(logid.value, ' <<< Mercure <<< ', s24(urn), ' ', lastEventID.value)
      })
    }
  })
  
  //  teardown
  const close = () => {
    console.log(logid.value, ' <<< closing down >>> ')
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
      status.value = 'CLOSED'
    }
    clearTimeout(_timer);
  }

  tryOnScopeDispose(() => {
    close()
  })

  //  startup
  const startup = () => {
    try {
      function contains(x: string, v: string): boolean { return x.indexOf(v) >= 0; }
      //  debug, trying to get the GraphQL subscription ID here
      const ux = new URL(url)
      
      if (contains(ux.search, "topic")) {
        const sx = ux.search.split("/")
        //  TODO ...
        const prev = sx.indexOf("subscriptions")
        
        if (prev + 1 < sx.length) {
          gqlSubscriptionID.value = sx[prev + 1]
        }
      }
      
      console.log(logid.value, ' new EventSource ')
      //
      eventSource.value = new EventSource(url, { withCredentials })
    }
    catch (ex) {
      //  TODO what to tell our client?
      console.log(ex)
    }
  }

  //  and...
  startup()

  return reactive({
    lastEventID,
    eventType,
    dataFieldsValues,
    firstDataField,
    urn, gqlSubscriptionID,
    status,

    eventSource,

    error,
    lastEventIDOnError,
    severity,

    //  teardown
    close
  })
}
