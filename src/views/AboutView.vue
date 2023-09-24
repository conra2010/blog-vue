<template>
  <p>Hello World!</p>
  {{ console.log(iris.value) }}
  <div v-if="iris">
    <div class="q-pa-md">
        <div v-for="(item, index) in infScrollSlice" :key="item" class="caption">
          <!-- <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum repellendus sit voluptate voluptas eveniet porro. Rerum blanditiis perferendis totam, ea at omnis vel numquam exercitationem aut, natus minima, porro labore.</p> -->
          <PostSummary :iri="item" />
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PostSummary from '@/components/PostSummary.vue';
import { gql, useQuery } from '@urql/vue';
import { ref, computed, watch } from 'vue';

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
const infScrollMark = ref(1)

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

</script>
