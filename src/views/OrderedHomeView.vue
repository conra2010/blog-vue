<template>
  <div v-if="iris">
    <div class="q-pa-md">
      <q-infinite-scroll @load="onLoadMore" :offset="250">
        <div v-for="(item, index) in infScrollSlice" :key="item" class="caption">
          <!-- <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum repellendus sit voluptate voluptas eveniet porro. Rerum blanditiis perferendis totam, ea at omnis vel numquam exercitationem aut, natus minima, porro labore.</p> -->
          <PostSummary :iri="item" :rmref="delta.deleted" :insref="delta.inserted"/>
        </div>
        <template v-slot:loading>
          <div class="row justify-center q-my-md">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </template>
      </q-infinite-scroll>
    </div>
  </div>
</template>

<script setup lang="ts">
import PostSummary from '@/components/PostSummary.vue';
import { gql, useQuery } from '@urql/vue';
import { ref, computed, watch } from 'vue';

import { useIRIsDelta, useMercureDelta } from '@/lib/delta'
import { MERCURE_WELL_KNOWN, MERCURE_TOPICS_PREFIX } from '@/config/api';

const queryIndexPostsSort = [{stars: "ASC"}]

//  a graphql query to get the IRIs of posts
const queryIndexPostsResponse = useQuery({
  query: gql`
    query QueryIndexPosts ($order: [PostFilter_order]) {
      posts (order: $order) {
        id
        title
      }
    }
  `, variables: { order: queryIndexPostsSort }
})

//  easy access to retrieved IRIs as an array
const iris = computed(() => {
  if (queryIndexPostsResponse.data?.value === undefined) return []

  return queryIndexPostsResponse.data?.value.posts.map((p) => p.id)
})

//  currently shown IRIs up to this array index
const infScrollMark = ref(25)

const infScrollSlice = computed(() => { return iris.value.slice(0, infScrollMark.value) })

function onLoadMore(index, done) {
  setTimeout(() => {
    if (infScrollMark.value < iris.value.length) {
      infScrollMark.value = Math.min(iris.value.length, infScrollMark.value + 10)
    }
    console.log('inf slice: [0, ', infScrollMark.value, ']')
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
    if (dtaval && dtaval['@id'] && dtaval['title']) {
      queryIndexPostsResponse.data.value.posts.unshift({ id: dtaval['@id'], title: dtaval['title'] })
    }
  }
})

</script>
