<template>
  <p>Hello World!</p>
  {{ console.log(iris.value) }}
  <div>
    <div class="q-pa-md">
      <q-scroll-area style="height: 600px">
        <div v-for="(item, index) in delta.inserted" :key="item" class="caption">
          <!-- <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum repellendus sit voluptate voluptas eveniet porro. Rerum blanditiis perferendis totam, ea at omnis vel numquam exercitationem aut, natus minima, porro labore.</p> -->
          <PostSummary :iri="item" :rmref="delta.deleted" :insref="delta.inserted"/>
        </div>
      </q-scroll-area>
    </div>
  </div>
  <div v-if="iris">
    <div class="q-pa-md">
      <q-infinite-scroll @load="onLoadMore" :offset="250">
        <div v-for="(item, index) in infScrollSlice" :key="item" class="caption">
          <!-- <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum repellendus sit voluptate voluptas eveniet porro. Rerum blanditiis perferendis totam, ea at omnis vel numquam exercitationem aut, natus minima, porro labore.</p> -->
          <PostSummary :iri="item" :rmref="delta.deleted" />
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

import { useIRIsDelta } from '@/lib/delta'
import { MERCURE_WELL_KNOWN, MERCURE_TOPICS_PREFIX } from '@/config/api';

//  a graphql query to get the IRIs of posts
const queryIndexPostsResponse = useQuery({
  query: gql`
    query QueryIndexPosts {
      posts {
        id
      }
    }
  `
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
const delta = useIRIsDelta(MERCURE_WELL_KNOWN + '?topic=' + MERCURE_TOPICS_PREFIX + '/posts/{id}')

</script>
