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
//  Vue component that 'manages' a Post resource
import PostSummary from '@/components/PostSummary.vue';
import { gql, useQuery } from '@urql/vue';
import { useEventBus } from '@vueuse/core';
import { useQuasar } from 'quasar';
import { ref, computed, watch, onUnmounted } from 'vue';
//  to notify errors
const $q = useQuasar()

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

//  detects errors in the query and notifies the user
watch(queryIndexPostsResponse.error, () => {
  $q.notify({message:'Error : GraphQL : urn:5c6a79f2',type:'error'})
})

//  easy access to retrieved IRIs as an array
const iris = computed(() => {
  //  not loaded yet
  if (queryIndexPostsResponse.data?.value === undefined) return []
  //  get only the IDs
  return queryIndexPostsResponse.data?.value.posts.map((p) => p.id)
})

//  currently shown IRIs up to this array index; used here to show only one components
const infScrollMark = ref(1)

const infScrollSlice = computed(() => { return iris.value.slice(0, infScrollMark.value) })

const rmbus = useEventBus<string>('rm')

const rmsubs = rmbus.on((event) => {
  queryIndexPostsResponse.executeQuery({ requestPolicy: 'network-only' })
})

onUnmounted(() => {
    //  cleanup ??
})

</script>
