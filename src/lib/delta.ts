import { ref, shallowRef, type Ref, computed, reactive } from 'vue';
import { type UseEventSourceOptions, tryOnScopeDispose } from '@vueuse/core';

//  will use the #create and #delete topics (modified API Platform) to 
//  request the execution of the GraphQL query that gets the IDs of resources
//
//  
export const useIRIsDelta = (baseurl: string, options: UseEventSourceOptions = {}) => {

    const deleted = reactive(new Set<string>())

    const inserted = reactive(new Set<string>())

  //  stuff we need to keep, two event sources
  const createFragmentEventSource = ref(null) as Ref<EventSource|null>
  const cstatus = ref('CONNECTING') as Ref<'OPEN'|'CONNECTING'|'CLOSED'>
  const cerror = shallowRef(null) as Ref<Event|null>

  const deleteFragmentEventSource = ref(null) as Ref<EventSource|null>
  const dstatus = ref('CONNECTING') as Ref<'OPEN'|'CONNECTING'|'CLOSED'>
  const derror = shallowRef(null) as Ref<Event|null>

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
    if (deleteFragmentEventSource.value) {
      deleteFragmentEventSource.value.close()
      deleteFragmentEventSource.value = null
      dstatus.value = 'CLOSED'
    }
  }

  //  stuff we use to construct functionality
  const cfev = new EventSource(baseurl + '%23create', { withCredentials })
  createFragmentEventSource.value = cfev

  const dfev = new EventSource(baseurl + '%23delete', { withCredentials })
  deleteFragmentEventSource.value = dfev

  //  handlers
  cfev.onopen = () => {
    cstatus.value = 'OPEN'
    cerror.value = null
  }
  dfev.onopen = () => {
    dstatus.value = 'OPEN'
    derror.value = null
  }

  //  recv a #create event, refetch all IDs
  //
  cfev.onmessage = (event) => {
    const json = JSON.parse(event.data)
    console.log('add: ', json['@id'])

    inserted.add(json['@id'])
  }

  //  recv a #delete event, refetch all IDs
  //
  dfev.onmessage = (event) => {
    const json = JSON.parse(event.data)
    console.log('delete: ', json['@id'])

    deleted.add(json['@id'])
  }

  cfev.onerror = (event) => {
    cstatus.value = 'CLOSED'
    cerror.value = event
  }
  dfev.onerror = (event) => {
    dstatus.value = 'CLOSED'
    derror.value = event
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
    deleteFragmentEventSource,
    dstatus,
    derror,
    close
  } 
}