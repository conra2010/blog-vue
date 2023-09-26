import { ref, shallowRef, type Ref, computed, reactive } from 'vue';
import { type UseEventSourceOptions, tryOnScopeDispose } from '@vueuse/core';

//  will use the #create and #delete topics (modified API Platform/Mercure) to 
//  keep track of inserted/removed IRIs
//  
export const useIRIsDelta = (baseurl: string, options: UseEventSourceOptions = {}) => {

    //  deleted IRIs
    const deleted = reactive(new Set<string>())
    //  inserted IRIs
    const inserted = reactive(new Set<string>())

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
    const cfev = new EventSource(baseurl + '%23{op}', { withCredentials })
    createFragmentEventSource.value = cfev

    //  handlers
    cfev.onopen = () => {
        cstatus.value = 'OPEN'
        cerror.value = null
    }
    //
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
        createFragmentEventSource,
        cstatus,
        cerror,
        close
    } 
}