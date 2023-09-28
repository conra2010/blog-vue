<script lang="ts" setup>
import { computed, ref, toRefs, type Ref } from 'vue';
import { gql, useMutation, useQuery, useSubscription } from '@urql/vue'
import { reactiveComputed, refDebounced } from '@vueuse/core';
import PostSummaryDebounce from './PostSummaryDebounce.vue';
import FieldChangeTracker from './FieldChangeTracker.vue';

//  component receives the Post IRI as prop
const props = defineProps<{ iri: string, rmref?: Set<string>, insref?: Set<string> }>()

const { iri, rmref, insref } = toRefs(props)

const isEditing = ref(true)

interface FieldChangeTracking<T> {
    og: Ref<T>;
    uv: Ref<T>;
}

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
    //  TODO

        detailsQuery.data.value.post.stars = response.updatePostSubscribe.post.stars
        detailsQuery.data.value.post.author = response.updatePostSubscribe.post.author
        detailsQuery.data.value.post.title = response.updatePostSubscribe.post.title

    return [response.updatePostSubscribe.post, ...messages]
}

//  subscription, we only care about the 'stars' field
//
//  this uses a modified API Platform/Mercure that computes the subscription
//  topic with not only the selection fields, but including the given resource
//  ID!; so we'll get notified only about that particular resource
//
const fastTrackingFieldsSubscription = useSubscription({
    query: gql`
    subscription FastTrackingSubscription ($iriv: ID!) {
      updatePostSubscribe (input: {id: $iriv, clientSubscriptionId: "urn:blog-vue:deefbf60"}) {
        post {
            title
            author
            stars
        }
        mercureUrl
        clientSubscriptionId
      }
    }
  `, variables: { iriv: iri },
}, handleSubscription)



//  exec graphql mutation to 'give a like' to this resource
function pushChanges(count: number) {
    updateStarCountMutation.executeMutation({ id: iri.value, count:count }).then(result => {
        console.log('updateStarCountMutation.executeMutation: result: ', result)
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

function updateTitle() { updateTitleMutation.executeMutation({id:iri.value,title:details.value.title}).then(result => {
    console.log('updateTitleMutation.executeMutation: result: ', result)
}) }

const updateTitleTDN = gql`mutation UpdateTitle($id:ID!,$title:String!) { updatePost (input:{id:$id,clientMutationId:"TDN01",title:$title}) { clientMutationId }}`

const updateTitleMutation = useMutation(updateTitleTDN)


function updateAuthor(author: string) { updateAuthorMutation.executeMutation({id:iri.value,author:author}).then(result => {
    console.log('updateAuthorMutation.executeMutation: result: ', result)
}) }

const updateAuthorTDN = gql`mutation UpdateAuthor($id:ID!,$author:String!) { updatePost (input:{id:$id,clientMutationId:"TDN02",author:$author}) { clientMutationId }}`

const updateAuthorMutation = useMutation(updateAuthorTDN)


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
        return "background-color: darkred;"
    }
    if (insref?.value?.has(iri.value)) {
        return "background-color: darkgreen;"
    }

    return "background-color: hsl(0, 0%, 25%);"
})

//  computed flag to disable content for deleted resources; eg. disable the 'like' button
const isDeletedResource = computed(() => {
    return (rmref?.value?.has(iri.value))
})

const expanded = ref(false)

function startEditing(field: string) {

}

const updatePostTitle = gql`mutation UpdatePost($id:ID!,$fvalue:String!) {
    updatePost (input:{id:$id,clientMutationId:"urn:blog-vue:64a8ff25",title:$fvalue}) {
        clientMutationId
    }
}`


const updatePostAuthor = gql`mutation UpdatePost($id:ID!,$fvalue:String!) {
    updatePost (input:{id:$id,clientMutationId:"urn:blog-vue:25cda677",author:$fvalue}) {
        clientMutationId
    }
}`

</script>

<template>
    <div v-if="details">
        <!-- <p>{{ titleRef }}</p> -->
        <q-card class="my-card q-mb-sm" :style="qcardStyle">
            <q-card-section style="color: hsl(0, 0%, 75%);">
                <div class="text-h5 q-mt-sm q-mb-xs">
                    <FieldChangeTracker label="Title" :iri="iri" :og="details.title" :mut="updatePostTitle"/>
                    <FieldChangeTracker label="Author" :iri="iri" :og="details.author" :mut="updatePostAuthor"/>
                    <!-- <q-input v-model="details.title" filled label="Title" />
                    <q-btn flat color="secondary" label="Save" @click="updateTitle" />
                    <q-input v-model="details.author" filled label="Author" />
                    <q-btn flat color="secondary" label="Save" @click="updateAuthor(details.author)" /> -->
                    <div class="text-h7">{{ details.publishedDate }}</div>
                </div>
                <div class="col-auto text-caption q-pt-md row no-wrap items-center">
                    <q-icon name="warning" />{{ details.id }}
                    <q-icon name="clock" />{{ details.version }}
                    <q-icon name="star" />{{ details.stars }}
                </div>
            </q-card-section>
            <q-card-actions>
                <q-btn flat :disable="isDeletedResource" color="secondary" label="Edit" />
                <q-btn flat :disable="isDeletedResource" color="primary" label="Like" @click="pushChanges(details.stars + 1)" />
                <q-space />
                <q-btn color="grey" round flat dense :icon="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                    @click="expanded = !expanded" />
            </q-card-actions>
            <q-slide-transition>
                <div v-show="expanded">
                    <q-separator />
                    <q-card-section class="text-subtitle2">
                        <div class="text-h7">Updated on {{ details.updatedDate }}</div>
                        <div class="col-auto text-grey text-caption q-pt-md row no-wrap items-center">
                            <q-icon name="warning" />{{ iri }}
                        </div>
                        <div class="text-h7">See {{ details.reference }}</div>
                        <div class="text-h7">Archived as {{ details.archiveUuid }}</div>
                        <div class="text-h7">(barcode) {{ details.archiveEan13 }}</div>
                        <div class="text-h7">Contact: {{ details.contact }}</div>
                        <div class="text-h7">Archived as {{ details.archiveUuid }}</div>
                        <div class="text-h7">(barcode) {{ details.archiveEan13 }}</div>
                        <div class="text-h7">Contact: {{ details.contact }}</div>
                    </q-card-section>
                    <q-card-section class="q-pt-none">
                        <div class="form-point">
                            {{ details.content }}
                        </div>
                    </q-card-section>
                    <q-card-actions>
                        <q-btn flat :disable="isDeletedResource" color="secondary" label="Delete" @click="deletePost" />
                    </q-card-actions>
                </div>
            </q-slide-transition>
        </q-card>
    </div>
</template>

<style>
q-card { color: hsl(0, 0%, 75%); }
</style>