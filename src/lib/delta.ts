import { watch, ref, shallowRef, type Ref, computed, reactive, toRefs } from 'vue';
import { type UseEventSourceOptions, tryOnScopeDispose } from '@vueuse/core';
import { useMercure, type UseMercureConfiguration } from './sse';

/**
 * Keeps sets of inserted and deleted IDs up to date using the Mercure events
 *
 * @param   {string}                   baseurl        where to reach Mercure
 * @param   {UseEventSourceOptions}    options        ???
 * @param   {UseMercureConfiguration}  configuration  timeout params to reconnect
 *
 * @return  {[type]}                                  sets of IDs and event info
 */
export const useMercureDelta = (baseurl: string, options: UseEventSourceOptions = {}, configuration?: UseMercureConfiguration) => {

    //  info we want to keep about IDs
    const inserted = reactive(new Set<string>())

    const deleted = reactive(new Set<string>())

    //  our precious event source
    const mercure = useMercure(baseurl, options, configuration)

    const { lastEventID, eventType, firstDataField } = toRefs(mercure)

    //  and the events we're interested in
    watch(lastEventID, () => {
        if (eventType.value === 'create') {
            inserted.add(firstDataField.value['@id'])
        }
        if (eventType.value === 'delete') {
            deleted.add(firstDataField.value['@id'])
        }
    })

    return {
        inserted, deleted,
        lastEventID, eventType, firstDataField
    }
}

//  will use the #create and #delete topics (modified API Platform/Mercure) to 
//  keep track of inserted/removed IRIs
//  
export const useIRIsDelta = (baseurl: string, options: UseEventSourceOptions = {}) => {

    //  deleted IRIs
    const deleted = reactive(new Set<string>())
    //  inserted IRIs
    const inserted = reactive(new Set<string>())
    //  
    const eventType: Ref<string> = ref('message')
    //  
    const eventDataValue: Ref<any|null> = ref(null)
    //
    const lastEventId: Ref<string|null> = ref(null)

    //  stuff we need to keep, two event source
    const createFragmentEventSource = ref(null) as Ref<EventSource|null>
    const cstatus = ref('CONNECTING') as Ref<'OPEN'|'CONNECTING'|'CLOSED'>
    const cerror = shallowRef(null) as Ref<Event|null>

    const {
        withCredentials = false,
    } = options;

    const reset = () => {
        deleted.clear()
        inserted.clear()
    }

    const close = () => {
        if (createFragmentEventSource.value) {
        createFragmentEventSource.value.close()
        createFragmentEventSource.value = null
        cstatus.value = 'CLOSED'
        }
    }

    const jsparse = (str: string) => {
        try {
            return [null, JSON.parse(str)]
        } catch (ex) {
            return [null]
        }
    }

    //    request notification for topics .../posts/{id}#{op}; the modified AP/Mercure
    //    will send {id}#create, {id}#update and {id}#delete fragments
    //
    const cfev = new EventSource(baseurl, { withCredentials })
    createFragmentEventSource.value = cfev

    //  handlers
    cfev.onopen = () => {
        cstatus.value = 'OPEN'
        cerror.value = null
    }
    //
    cfev.addEventListener('create', (e) => {
        //  pre
        lastEventId.value = e.lastEventId
        eventType.value = 'create'

        //  ONLY one data line with JSON content
        const [err, dataval] = jsparse(e.data)
        if (err) {
            console.log('failed parsing data value in create event')

            eventDataValue.value = null
        } else {
            inserted.add(dataval['@id'])

            eventDataValue.value = dataval
        }
    })

    cfev.addEventListener('delete', (e) => {
        //  ONLY one data line with JSON content
        const [err, dataval] = jsparse(e.data)
        if (err) {
            console.log('failed parsing data value in delete event')
        } else {
            deleted.add(dataval['@id'])
        }
    })

    cfev.onmessage = (event) => {
        //  SSE supports several lines of data in the same event
        //  see https://html.spec.whatwg.org/multipage/server-sent-events.html
        //
        //  process all lines of 'data' fields
        const datavals: string[] = event.data.split("\n")

        //  acc all json data values
        const buffer: any[] = []
        //  detect {id} and {op} in topics
        let idval: string | undefined = undefined
        let opval: string | undefined = undefined
        datavals.map((value) => {
            const [err, linejs] = jsparse(value)
            if (err) {
                console.log('recv data field is not json: ', value)
            } else {
                buffer.push(linejs)
                //  json contains the '@id' sent by the AP
                if (linejs['@id'] !== undefined) { idval = linejs['@id'] }
                //  json contains topics, detect type of operation
                if (linejs['topics'] !== undefined) {
                    linejs['topics'].map((topic: string) => {
                        if (topic.endsWith('#create')) { opval = 'create' }
                        if (topic.endsWith('#update')) { opval = 'update' }
                        if (topic.endsWith('#delete')) { opval = 'delete' }
                    })
                }
            }
        })
        //  got both {id} and {op}
        if (idval && opval) {
            //  a new resource ID, keep it
            if (opval === 'create') { inserted.add(idval) }
            //  a removed resource ID, keep track of that too
            if (opval === 'delete') { deleted.add(idval); }
        }
    }

    cfev.onerror = (event) => {
        cstatus.value = 'CLOSED'
        cerror.value = event
    }

    tryOnScopeDispose(() => {
        close()
    })

    return {
        deleted,
        inserted,
        lastEventId, eventType, eventDataValue,
        createFragmentEventSource,
        cstatus,
        cerror,
        close
    } 
}