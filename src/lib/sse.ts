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

    const yetAnotherCounter: Ref<string> = ref('hello world!')

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
