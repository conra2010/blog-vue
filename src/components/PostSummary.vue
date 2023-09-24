<script lang="ts" setup>
import { computed, ref, toRefs } from 'vue';
import { gql, useMutation, useQuery, useSubscription } from '@urql/vue'

//  component receives the Post IRI as prop
const props = defineProps<{ iri: string }>()

const { iri } = toRefs(props)

const detailsQuery = useQuery({
    query: gql`
    query PostDetails ($id: ID!) {
      post (id: $id) {
        id
        title
        content
      }
    }
  `,
    variables: { id: iri }
})

const details = computed(() => {
    if (detailsQuery.data?.value === undefined) return undefined
    
    return detailsQuery.data.value.post
})

</script>

<template>
    <div v-if="details">
        <q-card class="my-card text-white" style="background: radial-gradient(circle, #35a2ff 0%, #014a88 100%)">
            <q-card-section>
                <div class="row items-center no-wrap">
                    <div class="col">
                        <div class="text-h6">{{ details.title }}</div>
                    </div>
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="form-point">
                    {{ details.content }}
                </div>
            </q-card-section>
        </q-card>
    </div>
</template>