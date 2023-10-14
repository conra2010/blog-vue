<template>
  <div v-if="iris">
    <q-virtual-scroll
      virtualScrollSliceSize="8"
      virtualScrollItemSize="256"
      style="max-height: 1000px;"
      :items="iris"
      separator
      v-slot="{ item, index }">
      <q-item :key="index">
        <VErrorBoundary>
          <PostSummaryItem :iri="item" :rmref="delta.deleted" :insref="delta.inserted"/>
        </VErrorBoundary>
      </q-item>
    </q-virtual-scroll>
  </div>
</template>

<script setup lang="ts">
import PostSummaryItem from '@/components/PostSummaryItem.vue';
import { gql, useQuery } from '@urql/vue';
import { ref, computed, watch, reactive } from 'vue';

import { useIRIsDelta, useMercureDelta } from '@/lib/delta'
import { MERCURE_WELL_KNOWN, MERCURE_TOPICS_PREFIX } from '@/config/api';

import { useOnline } from '@vueuse/core';
import { useQuasar } from 'quasar';
import VErrorBoundary from '@/components/VErrorBoundary.vue';

const $q = useQuasar()

const isOnline = useOnline()

const queryIndexPostsSort = [{id: "ASC"}]

//  a graphql query to get the IRIs of posts
const queryIndexPostsResponse = useQuery({
  query: gql`
    query QueryIndexPosts ($order: [PostFilter_order]) {
      posts (order: $order) {
        id
      }
    }
  `, variables: { order: queryIndexPostsSort }
})

watch(queryIndexPostsResponse.error, () => {
  $q.notify({message:'Error : GraphQL : urn:5c6a79f2',type:'error'})
})

//  easy access to retrieved IRIs as an array
const iris = computed(() => {
  if (queryIndexPostsResponse.data?.value === undefined) return []

  let rx: string[] = queryIndexPostsResponse.data?.value.posts.map((p) => p.id)

  return rx
})

//  currently shown IRIs up to this array index
const infScrollMark = ref(25)

const infScrollSlice = computed(() => { return iris.value.slice(0, infScrollMark.value) })

function onLoadMore(index, done) {
  setTimeout(() => {
    console.log('loading more for slice : [0, ', infScrollMark.value, ']')
    if (infScrollMark.value < iris.value.length) {
      infScrollMark.value = Math.min(iris.value.length, infScrollMark.value + 10)
      console.log('inf slice new length : [0, ', infScrollMark.value, ']')
    }
    done()
  }, 2000)
}

//  exec graphql query again but force network access
//
const refetchQueryNetworkOnly = () => {
  if (queryIndexPostsResponse.isPaused) { queryIndexPostsResponse.resume() }
  queryIndexPostsResponse.executeQuery({ requestPolicy: 'network-only' })
}

//  testing this to keep track of inserted/removed resource IRIs from server events
//
const delta = useMercureDelta(MERCURE_WELL_KNOWN + '?topic=' + MERCURE_TOPICS_PREFIX + '/posts/{id}')

watch(delta.lastEventID, () => {
  if (delta.eventType.value == 'create') {
    const dtaval = delta.firstDataField.value
    if (dtaval && dtaval['@id']) {
      queryIndexPostsResponse.data.value.posts.unshift({ id: dtaval['@id'] })
    }
  }
  if (delta.eventType.value == 'delete') {
    refetchQueryNetworkOnly()
  }
})

watch(delta.error, () => {
  console.log(`Mercure Delta IRIs error: `, delta.error.value)
})

</script>
