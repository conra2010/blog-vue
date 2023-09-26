<template>
  <!-- {{ console.log(iris.value) }} -->
  <div v-if="iris">
    <div class="q-pa-md">
        <div v-for="item in infScrollSlice" :key="item" class="caption">
          <!-- component to show details of a particular Post -->
          <PostSummary :iri="item" />
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PostSummary from '@/components/PostSummary.vue';
import { gql, useQuery } from '@urql/vue';
import { ref, computed, watch } from 'vue';

//  a graphql query to get the IRIs of all posts (pagination disabled in AP resource class)
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
  //  not loaded yet
  if (queryIndexPostsResponse.data?.value === undefined) return []

  return queryIndexPostsResponse.data?.value.posts.map((p) => p.id)
})

//  currently shown IRIs up to this array index; used here to show only a few components
const infScrollMark = ref(1)

const infScrollSlice = computed(() => { return iris.value.slice(0, infScrollMark.value) })

</script>
