import { ref, computed, watch, shallowRef, type Ref, reactive } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'
import { useEventListener } from '@vueuse/core'
import { ReconnectingEventSource } from './recon'
export type UseEventSourceOptions = EventSourceInit

export interface MercureSource {

  lastEventID: string;
  eventType: string;
  dataFieldsValues: any[] | null;
  status: string;

  error: Event | null;
  lastEventIDOnError: string;
}

export function useMercure(url: string, options: UseEventSourceOptions = {}, configuration?: any): MercureSource {

  const lastEventID: Ref<string> = ref('')

  const eventType: Ref<string> = ref('')

  const dataFieldsValues: Ref<any[] | null> = ref(null)

  const status: Ref<string> = ref('CLOSED')

  const es: Ref<EventSource | null> = ref(null)

  //  error
  const error: Ref<Event|null> = ref(null)

  const lastEventIDOnError: Ref<string> = ref('')

  //  configuration
  const _retry_baseline: number = (configuration?.retry_baseline ?? 6000)
  const _retry_rng_span: number = (configuration?.retry_rng_span ?? 3000)

  //  reconnect with lastEventID
  let _timer;

  function reconnectURL(): string {
    let rx = url;

    if (lastEventID.value) {
      if (rx.indexOf('?') === -1) {
        rx += '?';
      } else {
        rx += '&';
      }
      rx += 'lastEventID=' + encodeURIComponent(lastEventID.value);
    }

    return rx
  }

  //  parsing
  function pre(e: MessageEvent<any>) {
    //  ?????
    eventType.value = e.type
    lastEventID.value = e.lastEventId
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

  //  init event source
  const {
    withCredentials = false,
  } = options

  //  setup event source listeners
  watch(es, () => {
    if (es.value) {
      //  management
      es.value.onopen = () => {
        status.value = 'OPEN'
        error.value = null
      }
      //  reconnect on error
      es.value.onerror = (e) => {
        error.value = e
        lastEventIDOnError.value = lastEventID.value

        console.log('Mercure EventSource: Error, closing connection...')

        //  cleanup first
        close()
        // reconnect after random timeout < max_retry_time
        // TODO config options
        const timeout = Math.round(_retry_baseline + _retry_rng_span * Math.random());
        
        _timer = setTimeout(() => {
          console.log('Mercure EventSource: attempt reconnection with lastEventID: ', lastEventID.value)
          //  a new event source
          es.value = new EventSource(reconnectURL(), { withCredentials })
        }, timeout);
      }
      //  generic 'message' type
      es.value.onmessage = (e: MessageEvent) => {
        pre(e)
        //
        dataFieldsValues.value = datavals(e)
      }
      //  API Platform 'create', 'update' and 'delete' messages
      es.value.addEventListener('create', (e) => {
        //console.log('create: ', e.data)
        pre(e)
        //
        dataFieldsValues.value = jslift(datavals(e))
      })
      es.value.addEventListener('update', (e) => {
        //console.log('update: ', e.data)
        pre(e)
        //
        dataFieldsValues.value = jslift(datavals(e))
      })
      es.value.addEventListener('delete', (e) => {
        //console.log('delete: ', e.data)
        pre(e)
        //
        dataFieldsValues.value = jslift(datavals(e))
      })
    }
  })
  
  //  teardown
  const close = () => {
    if (es.value) {
      es.value.close()
      es.value = null

      status.value = 'CLOSED'
    }
  }

  tryOnScopeDispose(() => {
    close()
  })

  //  startup
  es.value = new EventSource(url, { withCredentials })

  return reactive({
    lastEventID,
    eventType,
    dataFieldsValues,
    status,
    error,
    lastEventIDOnError
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
