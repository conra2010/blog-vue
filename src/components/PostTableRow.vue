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
        author
        publishedDate
        updatedDate
        reference
        archiveUuid
        contact
        archiveEan13
        signature
        signedBy
        version
      }
    }
  `,
    variables: { id: iri }
})

//  convenient access to post details
const details = computed(() => {
    //  loading... ?
    if (detailsQuery.data?.value === undefined) return undefined
    
    return detailsQuery.data.value.post
})

//  graphql subscription optional handler function to process received data
const handleSubscription = (messages = [], response) => {
    detailsQuery.data.value.post.stars = response.updatePostSubscribe.post.stars

    return [response.updatePostSubscribe.post, ...messages]
}

//  subscription, we only care about the 'stars' field
//
//  this uses a modified API Platform/Mercure that computes the subscription
//  topic with not only the selection fields, but including the given resource
//  ID!; so we'll get notified only about that particular resource
//
const starCountSubscription = useSubscription({
  query: gql`
    subscription StarCount ($iriv: ID!) {
      updatePostSubscribe (input: {id: $iriv, clientSubscriptionId: "urn:blog-vue:deefbf60"}) {
        post {
          stars
        }
        mercureUrl
        clientSubscriptionId
      }
    }
  `, variables: { iriv: iri },
}, handleSubscription)

//  exec graphql mutation to 'give a like' to this resource
function pushChanges() {
    updateStarCountMutation.executeMutation({ id: iri.value, count: details.value.stars + 1 }).then(result => {
        console.log(result)
    })
}

//  the graphql operation
const updateStarCountMutation = useMutation(gql`
    mutation IncrementStarCount ($id: ID!, $count: Int!) {
        updatePost (input: { id: $id, clientMutationId: "urn:blog-vue:c1662453", stars: $count }) {
            clientMutationId
        }
    }
`)

function deletePost() {
    deletePostResult.executeMutation({ id: iri.value }).then((result) => {
        console.log(result)
    })
}

const deletePostResult = useMutation(gql`
    mutation DeletePost ($id: ID!) {
        deletePost (input: { id: $id, clientMutationId: "urn:blog-vue:a68fc51b" }) {
            clientMutationId
        }
    }
`)

//  computed style for deleted/inserted or (default) state of resources
const qcardStyle = computed(() => {
    if (rmref?.value?.has(iri.value)) {
        return "background: radial-gradient(circle, #ff3535 0%, #650101 100%)"
    }
    if (insref?.value?.has(iri.value)) {
        return "background: radial-gradient(circle, #a5f775 0%, #406835 100%)"
    }

    return "background: radial-gradient(circle, #35a2ff 0%, #014a88 100%)"
})

//  computed flag to disable content for deleted resources; eg. disable the 'like' button
const isDeletedResource = computed(() => {
    return (rmref?.value?.has(iri.value))
})

</script>

<template>
    <div v-if="details">
        <q-card class="my-card text-white q-mb-sm" :style="qcardStyle">
            <q-card-section>
                <div class="row items-center no-wrap">
                    <div class="col">
                        <div class="text-h6">{{ details.title }}</div>
                        <div class="text-h7">{{ details.author }} on {{ details.publishedDate }}</div>
                        <div class="text-h7">Updated on {{ details.updatedDate }}</div>
                        <div class="col-auto text-grey text-caption q-pt-md row no-wrap items-center">
                            <q-icon name="warning" />{{ iri }}
                            <q-icon name="star" />{{ details.stars }}
                            <q-icon name="clock" />{{ details.version }}
                        </div>
                        <div class="text-h7">See {{ details.reference }}</div>
                    </div>
                </div>
            </q-card-section>
            <q-card-section>
                <div class="row items-center no-wrap">
                    <div class="col">
                        <div class="text-h7">Archived as {{ details.archiveUuid }}</div>
                        <div class="text-h7">(barcode) {{ details.archiveEan13 }}</div>
                        <div class="text-h7">Contact: {{ details.contact }}</div>
                    </div>
                </div>
            </q-card-section>
            <q-card-section>
                <div class="row items-center no-wrap">
                    <div class="col">
                        <div class="text-h6">Signature</div>
                        <div class="text-h7">{{ details.signature }}</div>
                        <div class="text-h7">{{ details.signedBy }}</div>
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
                <q-btn :disable="isDeletedResource" color="primary" label="Delete" @click="deletePost" />
            </q-card-actions>
        </q-card>
    </div>
</template>
