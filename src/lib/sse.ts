import { ref, computed, watch, shallowRef, type Ref, reactive, toRefs } from 'vue'
import { refDebounced, tryOnScopeDispose, watchDebounced } from '@vueuse/core'
import { useEventListener, useWebWorkerFn } from '@vueuse/core'
import { ReconnectingEventSource } from './recon'
import { v4 as uuidv4 } from 'uuid'

import { useNetwork, useDateFormat } from '@vueuse/core'

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
   * The status of the event sourc
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
  //  teardown
  close: any;
}

export interface UseMercureConfiguration {
  /**
   * will try to reconnect at baseline + rng span
   */
  retry_baseline?: number;
  retry_rng_span?: number;

  retry_max_ntries?: number;
}

export function useMercure(url: string, options: UseEventSourceOptions = {}, configuration?: UseMercureConfiguration): MercureSource {
  //  data about the event received
  const lastEventID: Ref<string> = ref('')

  const eventType: Ref<string> = ref('')

  const dataFieldsValues: Ref<any[] | null> = ref(null)

  const firstDataField = computed(() => {
    if (dataFieldsValues.value !== null) {
      return dataFieldsValues.value[0]
    }
    
    return null
  })

  //  status and event source
  const status: Ref<string> = ref('CLOSED')

  const eventSource: Ref<EventSource | null> = ref(null)

  //  urn
  const urn: string = uuidv4()

  //  GraphQL 
  const gqlSubscriptionID: Ref<string> = ref('')

  //  error
  const error: Ref<Event|null> = ref(null)

  const lastEventIDOnError: Ref<string> = ref('')

  //  configuration
  const _retry_baseline: number = (configuration?.retry_baseline ?? 6000)
  const _retry_rng_span: number = (configuration?.retry_rng_span ?? 3000)
  const _retry_max_ntries: number = (configuration?.retry_max_ntries ?? 3)

  //  reconnect with lastEventID
  let _timer: number;

  let _ntries: number = 0;

  //  debugging
  let _lastErrorTimeStamp: number;

  //  network status
  const { isOnline, onlineAt, offlineAt } = useNetwork()

  watchDebounced(isOnline, () => {
    if (!isOnline.value) {
      //  went offline
      console.log('useMercure : network is now offline : ', useDateFormat(offlineAt.value, 'YYYY-MM-DD HH:mm:ss SSS').value)
      close()
    } else {
      //  went online
      console.log('useMercure : network is now online : ', useDateFormat(onlineAt.value, 'YYYY-MM-DD HH:mm:ss SSS').value)
      reconnect()
    }
  }, { debounce: 1000, maxWait: 5000 })

  //  logging
  const logid = computed(() => {
    if (gqlSubscriptionID.value !== '') {
      return urn + ":" + gqlSubscriptionID.value
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

  //  shared for all event types
  function pre(e: MessageEvent<any>) {
    //  ?????
    eventType.value = e.type
    lastEventID.value = e.lastEventId
  }

  //  parsing into JSON
  const jsparse = (str: string) => {
    try {
      return [null, JSON.parse(str)]
    } catch (ex) {
      return [null]
    }
  }

  //  see event source spec
  function datavals(e: MessageEvent<any>): string[] {
    return e.data.split("\n")
  }

  //  data: as JSON
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

  function reconnect() {

    close()

    if (_ntries < _retry_max_ntries) {
      // reconnect after random timeout
      const timeout = Math.round(_retry_baseline + _retry_rng_span * Math.random());
      
      _timer = setTimeout(() => {
        console.log(logid.value, 'Will attempt to reconnect for lastEventID ', (lastEventID.value !== '' ? lastEventID.value : '(undefined)'))
        
        _ntries++

        //  a new event source
        eventSource.value = new EventSource(reconnectURL(), { withCredentials })
      }, timeout);
    } else {
      console.log(logid.value, 'Max retries reached with lastEventID ', (lastEventID.value !== '' ? lastEventID.value : '(undefined)'))
    }
  }

  //  setup event source listeners
  watch(eventSource, () => {
    if (eventSource.value) {
      //  management
      eventSource.value.onopen = () => {
        status.value = 'OPEN'
        error.value = null

        //  reference value
        _lastErrorTimeStamp = performance.now()

        //  reset retry count
        _ntries = 0;
      }
      //  reconnect on error
      eventSource.value.onerror = (e) => {
        //  debugging Mercure disconnects (config option)
        const mark = performance.now()
        
        const split = (mark - _lastErrorTimeStamp)

        console.log(logid.value, ' error split: ', split / 1000 / 60, ' minutes')

        //  reference
        _lastErrorTimeStamp = mark

        error.value = e
        lastEventIDOnError.value = lastEventID.value

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
      })
    }
  })
  
  //  teardown
  const close = () => {
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
    status,

    eventSource,

    error,
    lastEventIDOnError,

    //  teardown
    close
  })
}

/**
 * Reactive wrapper for EventSource / Mercure.
 *
 * @see https://vueuse.org/useEventSource
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource EventSource
 * @param url
 * @param events
 * @param options
 */
export function useMercureEventSource(url: string, events: Array<string> = [], options: UseEventSourceOptions = {}) {

  const dataFieldsValues: Ref<any[] | null> = ref(null)

  const eventType: Ref<string> = ref('message')

  const lastEventId: Ref<string> = ref('')

  const yetAnotherCounter: Ref<string> = ref('hello world!')

  const event: Ref<string | null> = ref(null)
  const data: Ref<string | null> = ref(null)

  const status = ref('CONNECTING') as Ref<'OPEN' | 'CONNECTING' | 'CLOSED'>

  const eventSource = ref(null) as Ref<EventSource | null>
  const error = shallowRef(null) as Ref<Event | null>

  const history: Ref<string[]> = ref([])

  const CONNECTING = 0;
  const OPEN = 1;
  const CLOSED = 2;

  let _timer: number;

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

  eventSource.value = new EventSource(url, { withCredentials })
  _setup()

  function _restart() {
    let urlv = url;

    if (lastEventId.value) {
      if (urlv.indexOf('?') === -1) {
        urlv += '?';
      } else {
        urlv += '&';
      }
      urlv += 'lastEventID=' + encodeURIComponent(lastEventId.value);
    }

    eventSource.value = new EventSource(urlv, { withCredentials });
    _setup()
  }

  function _setup() {
    if (eventSource.value) {
      eventSource.value.onopen = () => {
        status.value = 'OPEN'
        error.value = null
      }
      eventSource.value.onerror = (e) => {
        status.value = 'CLOSED'
        error.value = e

        if (eventSource.value) {
          if (eventSource.value.readyState !== CLOSED) {
            // reconnect with new object
            eventSource.value.close();
            eventSource.value = null;
          }
          // reconnect after random timeout < max_retry_time
          const timeout = Math.round(3000 * Math.random());

          _timer = setTimeout(() => _restart(), timeout);
        }
      }
      eventSource.value.addEventListener('create', (e) => {
        console.log('create: ', e.data)

        pre(e)
        //  eventType.value = 'create'
        dataFieldsValues.value = jslift(datavals(e))
      })

      eventSource.value.addEventListener('update', (e) => {
        console.log('update: ', e.data)


        pre(e)
        //  eventType.value = 'create'
        dataFieldsValues.value = jslift(datavals(e))
      })

      eventSource.value.addEventListener('delete', (e) => {
        console.log('delete: ', e.data)


        pre(e)
        //  eventType.value = 'create'
        dataFieldsValues.value = jslift(datavals(e))
      })

      eventSource.value.onmessage = (e: MessageEvent) => {
        console.log('message: ', e)

        pre(e)
        //
        dataFieldsValues.value = datavals(e)
      }
    }
  }

  function pre(e: MessageEvent<any>) {
    //  ?????
    event.value = null
    data.value = e.data

    eventType.value = e.type
    lastEventId.value = e.lastEventId
  }

  for (const event_name of events) {
    useEventListener(eventSource.value, event_name, (e: Event & { data?: string }) => {
      event.value = event_name
      data.value = e.data || null
    })
  }

  tryOnScopeDispose(() => {
    close()
  })

  return reactive({
    dataFieldsValues, lastEventId, eventType,
    yetAnotherCounter,
    //  and...
    eventSource,
    event,
    data,
    history,
    ecount,
    status,
    error,
    close,
  })
}

export type UseMercureEventSourceReturn = ReturnType<typeof useMercureEventSource>


function makeMap(str, expectsLowerCase) {
  const map = /* @__PURE__ */ Object.create(null);
  const list = str.split(",");
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase ? (val) => !!map[val.toLowerCase()] : (val) => !!map[val];
}

const hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (val, key) => hasOwnProperty.call(val, key);
const isArray = Array.isArray;
const isMap = (val) => toTypeString(val) === "[object Map]";
const isSet = (val) => toTypeString(val) === "[object Set]";
const isDate = (val) => toTypeString(val) === "[object Date]";
const isRegExp = (val) => toTypeString(val) === "[object RegExp]";
const isFunction = (val) => typeof val === "function";
const isString = (val) => typeof val === "string";
const isSymbol = (val) => typeof val === "symbol";
const isObject = (val) => val !== null && typeof val === "object";
const isPromise = (val) => {
  return isObject(val) && isFunction(val.then) && isFunction(val.catch);
};
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const toRawType = (value) => {
  return toTypeString(value).slice(8, -1);
};
const isPlainObject = (val) => toTypeString(val) === "[object Object]";
const isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
const isReservedProp = /* @__PURE__ */ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
);
const isBuiltInDirective = /* @__PURE__ */ makeMap(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
);

export const toDisplayStringx = (val) => {
  if (isString(val)) {
    return val
  }
  if (val == null) {
    return ""
  }
  // if (val && val.__v_isRef && isString(val.value)) {
  //   return val.value
  // }
  if (isArray(val) || isObject(val) && (val.toString === objectToString || !isFunction(val.toString))) {
    return JSON.stringify(val, replacer, 2)
  }
  return String(val);
  //return isString(val) ? val : val == null ? "" : isArray(val) || isObject(val) && (val.toString === objectToString || !isFunction(val.toString)) ? JSON.stringify(val, replacer, 2) : String(val);
};

const replacer = (_key, val) => {
  if (val && val.__v_isRef) {
    return replacer(_key, val.value);
  } else if (isMap(val)) {
    return {
      [`Map(${val.size})`]: [...val.entries()].reduce((entries, [key, val2]) => {
        entries[`${key} =>`] = val2;
        return entries;
      }, {})
    };
  } else if (isSet(val)) {
    return {
      [`Set(${val.size})`]: [...val.values()]
    };
  } else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
    return String(val);
  }
  return val;
};
