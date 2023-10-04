<template>
  <div v-if="iris">
    <q-virtual-scroll
      virtualScrollSliceSize="10"
      virtualScrollItemSize="330"
      style="max-height: 1000px;"
      :items="iris"
      separator
      v-slot="{ item, index }">
      <q-item :key="index">
        <PostSummaryItem :iri="item" :rmref="delta.deleted" :insref="delta.inserted"/>
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

//  easy access to retrieved IRIs as an array
const iris = computed(() => {
  if (queryIndexPostsResponse.data?.value === undefined) return []

  let rx: string[] = queryIndexPostsResponse.data?.value.posts.map((p) => p.id)

  return rx
})

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

</script>
