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
import { MERCURE_TOPICS_PREFIX, MERCURE_WELL_KNOWN } from '@/config/api';
import { useMercureStore } from '@/stores/mercure';
import { gql, useQuery } from '@urql/vue';
import { useQuasar } from 'quasar';
import { ref, computed, watch } from 'vue';
import { onPush, pipe, publish } from 'wonka';

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

watch(queryIndexPostsResponse.error, () => {
  $q.notify({message:'Error : GraphQL : urn:5c6a79f2',type:'error'})
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


const { source, forTopic } = useMercureStore()

const something = pipe(source,
  onPush((value) => {
    if (value.apiEventType === 'create') {
      //  show the new guy
      queryIndexPostsResponse.data.value.posts.unshift({ id: value.apiResourceID })
    }
    if (value.apiEventType === 'delete' && value.apiResourceID === iris.value[0]) {
      //  was our guy
      queryIndexPostsResponse.executeQuery({ requestPolicy: 'network-only' })
    }
  }),
  publish
  )


const subs = forTopic(MERCURE_TOPICS_PREFIX + '/posts/{id}')

const anything = pipe(subs,
  onPush((value) => {
    console.log('subs ', value)
  }),
  publish
)

</script>
