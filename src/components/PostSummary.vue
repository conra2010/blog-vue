<script lang="ts" setup>
import { computed, ref, shallowRef, watch, toRefs, type Ref, type ShallowRef, inject } from 'vue';
import { gql, useMutation, useQuery, useSubscription, type SubscriptionHandler } from '@urql/vue'
import { reactiveComputed, refDebounced, useOnline } from '@vueuse/core';
import PostSummaryDebounce from './PostSummaryDebounce.vue';
import FieldChangeTracker from './FieldChangeTracker.vue';
import { useQuasar } from 'quasar';
import QCardInlineNotification from './QCardInlineNotification.vue';

import { useSignalsStore } from '@/stores/signals';

import mitt, { type Emitter } from 'mitt'
import { type MercureSourceEvents } from '@/lib/sse'
import { fasLinesLeaning } from '@quasar/extras/fontawesome-v6';
import { assertWrappingType } from 'graphql';

import * as _ from 'lodash'

//  component receives the Post IRI as prop
const props = defineProps<{
    iri: string,
    rmref?: Set<string>,
        insref?: Set<string>,
}>()

const { iri, rmref, insref } = toRefs(props)

const $q = useQuasar()

const isOnline = useOnline()

const isRunning = ref(true)

const errorref: Ref<any | undefined> = ref(undefined)

const errortag: Ref<string | undefined> = ref('')

const {emitter} = useSignalsStore()
//: Emitter<MercureSourceEvents> | undefined = inject('emitter')
    //mitt<MercureSourceEvents>()

emitter?.on('foo', (e) => {
    console.log(e)
})

interface Signal {
    key: number;
    isRunning: ShallowRef<boolean>;
}

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
        stars
        author
        version
      }
    }
  `,
    variables: { id: iri }
})

watch(detailsQuery.error, () => {
  $q.notify({message:'Error : GraphQL : urn:5c6b64f2',type:'error'})
  isRunning.value = false
  errorref.value = detailsQuery.error
  errortag.value = 'PostSummary:PostDetails'
})

//  convenient access to post details
const details = computed(() => {
    //  loading... ?
    if (detailsQuery.data?.value === undefined) return undefined

    return detailsQuery.data.value.post
})

//  graphql subscription optional handler function to process received data
const isMercureEventSourceOpen = ref(true)

const handler: SubscriptionHandler<any, any> = (prev: any, data: any): any => {
    if (data) {

        if (data.updatePostSubscribe) {
            _.assign(detailsQuery.data.value.post, data.updatePostSubscribe.post)
            
            //detailsQuery.data.value.post = data.updatePostSubscribe.post || detailsQuery.data.value.post
        }
        if (data['urn:mercure:updatePostSubscribe']) {
            isMercureEventSourceOpen.value = (data['urn:mercure:updatePostSubscribe']['status'] === 'OPEN')
            
            errortag.value = data['urn:mercure:updatePostSubscribe']['status']
        }
    }
    return data
}

const handleSubscription = (messages = [], response) => {
    //  TODO
    if (response) {
        if (response.updatePostSubscribe) {
            detailsQuery.data.value.post.stars = response.updatePostSubscribe.post.stars
            detailsQuery.data.value.post.author = response.updatePostSubscribe.post.author
            detailsQuery.data.value.post.title = response.updatePostSubscribe.post.title
            return [response.updatePostSubscribe.post, ...messages]
        }
        if (response.updatePostSubscribe_MercureSourceTracing) {
            isMercureEventSourceOpen.value = (response.updatePostSubscribe_MercureSourceTracing.status === 'OPEN')
        }
    }
    return messages
}

//  subscription, we only care about the 'stars' field
//
//  this uses a modified API Platform/Mercure that computes the subscription
//  topic with not only the selection fields, but including the given resource
//  ID!; so we'll get notified only about that particular resource
//
const { signal } = useSignalsStore()

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
    `,
    variables: { iriv: iri }
}, handler)

watch(fastTrackingFieldsSubscription.extensions, () => {
    const ext = fastTrackingFieldsSubscription.extensions?.value
    if (ext && ext['urn:mercure:updatePostSubscribe']) {
        isMercureEventSourceOpen.value = (ext['urn:mercure:updatePostSubscribe']['status'] === 'OPEN')
    }
    console.log('fts ext: ', fastTrackingFieldsSubscription.extensions)
})

watch(fastTrackingFieldsSubscription.error, () => {
    console.log('fts error ref: ', fastTrackingFieldsSubscription.error)
    $q.notify({message:'Error : GraphQL : urn:a835c5d6',type:'error'})
    isRunning.value = false
    errorref.value = fastTrackingFieldsSubscription.error
})

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


//  computed style for deleted/inserted or (default) state of resources
const qcardStyle = computed(() => {
    let bgrx: string = "background-color: hsl(0, 0%, 25%);"
    // if (rmref?.value?.has(iri.value)) {
    //     bgrx = "background-color: darkred;"
    // }
    // if (insref?.value?.has(iri.value)) {
    //     bgrx = "background-color: darkgreen;"
    // }

    return bgrx
})

//  computed flag to disable content for deleted resources; eg. disable the 'like' button
const isDeletedResource = computed(() => {
    return (rmref?.value?.has(iri.value))
})

const updatePostTitle = gql`mutation UpdatePostTitle($id:ID!,$fvalue:String!) {
    updatePost (input:{id:$id,clientMutationId:"urn:blog-vue:64a8ff25",title:$fvalue}) {
        clientMutationId
    }
}`


const updatePostAuthor = gql`mutation UpdatePostAuthor($id:ID!,$fvalue:String!) {
    updatePost (input:{id:$id,clientMutationId:"urn:blog-vue:25cda677",author:$fvalue}) {
        clientMutationId
    }
}`

function deletePost() {
    deletePostResult.executeMutation({ id: iri.value }).then((result) => {
        console.log(result)
    })
}

//  post { id } selection forces __typename field in result and urql cache 
//  invalidation; to avoid stale values on Post queries
const deletePostResult = useMutation(gql`
    mutation DeletePost ($id: ID!) {
        deletePost (input: { id: $id, clientMutationId: "urn:blog-vue:a68fc51b" }) {
            post {
                id
            }
            clientMutationId
        }
    }
`)

</script>

<template>
    <div>
        <div v-if="details">
            <q-card class="my-card q-mb-sm" :style="qcardStyle">
                <q-card-section>
                    <q-badge :color="isRunning ? 'green' : 'red'">
                        (running)
                    </q-badge>
                    <q-badge v-if="isMercureEventSourceOpen" color="blue">
                        {{ iri }}
                    </q-badge>
                    <q-badge v-else color="red">
                        <q-icon name="warning">
                            <q-tooltip>Some error!</q-tooltip>
                        </q-icon>
                        {{ iri }}
                    </q-badge>
                    <p>{{ errortag }}</p>
                </q-card-section>
                <q-card-section>
                    <div class="text-h5 q-mt-sm q-mb-xs">
                        <FieldChangeTracker label="Title" :iri="iri" :og="details.title" :mut="updatePostTitle"/>
                        <FieldChangeTracker label="Author" :iri="iri" :og="details.author" :mut="updatePostAuthor"/>
                        <!-- <q-input v-model="details.title" filled label="Title" />
                            <q-btn flat color="secondary" label="Save" @click="updateTitle" />
                            <q-input v-model="details.author" filled label="Author" />
                            <q-btn flat color="secondary" label="Save" @click="updateAuthor(details.author)" /> -->
                    </div>
                    <div class="col-auto text-caption q-pt-md row no-wrap items-center">
                            <q-icon name="clock" />{{ details.version }}
                            <q-icon name="star" />{{ details.stars }}
                    </div>
                </q-card-section>
                <q-card-actions>
                        <q-btn flat :disable="isDeletedResource||(!isOnline)" color="primary" label="Delete" @click="deletePost" />
                        
                        <q-btn flat :disable="isDeletedResource||(!isOnline)" color="primary" label="Like" @click="pushChanges(details.stars + 1)" />
                        
                </q-card-actions>
            </q-card>
        </div>
    </div>
</template>

<style>
q-card { color: hsl(0, 0%, 75%); }
</style>