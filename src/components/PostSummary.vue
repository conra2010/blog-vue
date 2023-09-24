<script lang="ts" setup>
import { computed, ref, toRefs } from 'vue';
import { gql, useMutation, useQuery, useSubscription } from '@urql/vue'

//  component receives the Post IRI as prop
const props = defineProps<{ iri: string, rmref?: Set<string>, insref?: Set<string> }>()

const { iri, rmref, insref } = toRefs(props)

//  graphql query for details 
const detailsQuery = useQuery({
    query: gql`
    query PostDetails ($id: ID!) {
      post (id: $id) {
        id
        title
        content
        stars
      }
    }
  `,
    variables: { id: iri }
})

const details = computed(() => {
    if (detailsQuery.data?.value === undefined) return undefined
    
    return detailsQuery.data.value.post
})

//  graphql subscription
const handleSubscription = (messages = [], response) => {
    detailsQuery.data.value.post.stars = response.updatePostSubscribe.post.stars

    return [response.updatePostSubscribe.post, ...messages]
}

const starCountSubscription = useSubscription({
  query: gql`
    subscription StarCount ($iriv: ID!) {
      updatePostSubscribe (input: {id: $iriv, clientSubscriptionId: "foo"}) {
        post {
          stars
        }
        mercureUrl
        clientSubscriptionId
      }
    }
  `, variables: { iriv: iri },
}, handleSubscription)

//  graphql mutation
function pushChanges() {
    updateStarCountMutation.executeMutation({ id: iri.value, count: details.value.stars + 1 }).then(result => {
        console.log(result)
    })
}

const updateStarCountMutation = useMutation(gql`
    mutation IncrementStarCount ($id: ID!, $count: Int!) {
        updatePost (input: { id: $id, clientMutationId: "foobar", stars: $count }) {
            clientMutationId
        }
    }
`)

const qcardStyle = computed(() => {
    if (rmref?.value?.has(iri.value)) {
        return "background: radial-gradient(circle, #ff3535 0%, #650101 100%)"
    }
    if (insref?.value?.has(iri.value)) {
        return "background: radial-gradient(circle, #a5f775 0%, #406835 100%)"
    }

    return "background: radial-gradient(circle, #35a2ff 0%, #014a88 100%)"
})

const isDeletedResource = computed(() => {
    return (rmref?.value?.has(iri.value))
})

</script>

<template>
    <div v-if="details">
        <q-card class="my-card text-white" :style="qcardStyle">
            <q-card-section>
                <div class="row items-center no-wrap">
                    <div class="col">
                        <div class="text-h6">{{ details.title }}</div>
                        <div class="col-auto text-grey text-caption q-pt-md row no-wrap items-center">
                            <q-icon name="warning" />{{ iri }}
                            <q-icon name="star" />{{ details.stars }}
                        </div>
                    </div>
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="form-point">
                    {{ details.content }}
                </div>
            </q-card-section>
            <q-separator dark />
            <q-card-actions>
                <q-btn :disable="isDeletedResource" color="primary" label="Like" @click="pushChanges" />
            </q-card-actions>
        </q-card>
    </div>
</template>
