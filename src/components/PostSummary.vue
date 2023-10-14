<script lang="ts" setup>
import { computed, ref, shallowRef, watch, toRefs, type Ref, type ShallowRef, inject, onActivated, onDeactivated } from 'vue';
import {
    onBeforeMount, onBeforeUpdate,
    onMounted,
    onBeforeUnmount, onUnmounted } from 'vue';
import { gql, useMutation, useQuery, useSubscription, type SubscriptionHandler } from '@urql/vue'
import { useOnline } from '@vueuse/core';
import FieldChangeTracker from './FieldChangeTracker.vue';
import { useQuasar } from 'quasar';
import { v4 as uuidv4 } from 'uuid'

import * as _ from 'lodash'

//  component receives the Post IRI as prop
const props = defineProps<{
    iri: string,
    rmref?: Set<string>,
    insref?: Set<string>,
}>()

const { iri, rmref, insref } = toRefs(props)

const $q = useQuasar()

//  urn
const urn: string = `vue:${uuidv4()}`

const isOnline = useOnline()

const isRunning = ref(true)

const isLoading = ref(true)

const errorref: Ref<any | undefined> = ref(undefined)

const errortag: Ref<string | undefined> = ref('')

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

watch(detailsQuery.fetching, () => {
    isLoading.value = detailsQuery.fetching.value
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
            console.log(urn, ' handler/data')
            _.assign(detailsQuery.data.value.post, data.updatePostSubscribe.post)
            //detailsQuery.data.value.post = data.updatePostSubscribe.post || detailsQuery.data.value.post
        }
        if (data.extensions) {
            console.log(urn, ' handler/extensions')
        }
    }
    return data
}

//  subscription, we only care about the 'stars' field
//
//  this uses a modified API Platform/Mercure that computes the subscription
//  topic with not only the selection fields, but including the given resource
//  ID!; so we'll get notified only about that particular resource
//
const fastTrackingFieldsSubscription = useSubscription({
    query: gql`
        subscription FastTrackingSubscription ($iriv: ID!, $csid: String!) {
            updatePostSubscribe (input: {id: $iriv, clientSubscriptionId: $csid}) {
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
    variables: { iriv: iri, csid: urn }
}, handler)

const exts: Ref<Record<string,any> | undefined> = ref(undefined)

watch(fastTrackingFieldsSubscription.extensions, () => {

    exts.value = fastTrackingFieldsSubscription.extensions?.value

    const ext = fastTrackingFieldsSubscription.extensions?.value
    if (ext && ext['urn:mercure:updatePostSubscribe']) {
        isMercureEventSourceOpen.value = (ext['urn:mercure:updatePostSubscribe']['status'] === 'OPEN')
        console.log(urn, ' ', ext['urn:mercure:updatePostSubscribe'])
    }
    // console.log('fts ext: ', exts.value)
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

onBeforeMount(() => {
    console.log(urn, ' on before mount')
})

onMounted(() => {
    console.log(urn, ' on mounted')
})

onBeforeUpdate(() => {
    console.log(urn, ' on before update')
})

onBeforeUnmount(() => {
    console.log(urn, ' on before unmount')
})

onUnmounted(() => {
    console.log(urn, ' on unmounted')
})

onActivated(() => {
    console.log(urn, ' on activated')
})

onDeactivated(() => {
    console.log(urn, ' on deactivated')
})

</script>

<template>
    <div>
        <q-card class="bg-grey-9 text-white q-mb-sm" >
            <q-card-section>
                <div class="text-caption">Vue Component ID
                    <q-badge :color="isRunning ? 'positive' : 'negative'">
                        {{ _.truncate(urn, { length: 24 }) }}
                    </q-badge>
                </div>
                <div class="text-caption">Resource IRI
                    <q-badge v-if="isMercureEventSourceOpen" color="info">
                        {{ iri }}
                    </q-badge>
                </div>
            </q-card-section>
            <q-card-section v-if="exts !== undefined">
                <div class="text-caption">Event Source Status
                    <q-badge :color="isMercureEventSourceOpen ? 'positive' : 'negative'">
                        {{ exts['urn:mercure:updatePostSubscribe'].status }}
                    </q-badge>
                </div>
                <div class="text-caption">Source ID
                    <q-badge :color="isMercureEventSourceOpen ? 'positive' : 'negative'">
                        {{ _.truncate(exts['urn:mercure:updatePostSubscribe'].urn, { length: 24 }) }}
                    </q-badge>
                </div>
                <div class="text-caption">GraphQL Subscription ID
                    <q-badge :color="isMercureEventSourceOpen ? 'positive' : 'negative'">
                        subs:{{ _.truncate(exts['urn:mercure:updatePostSubscribe'].subscription, { length: 24 }) }}
                    </q-badge>
                </div>
                <div class="text-caption">Last Event ID
                    <q-badge :color="isMercureEventSourceOpen ? 'positive' : 'negative'">
                        {{ _.truncate(exts['urn:mercure:updatePostSubscribe'].lastEventID, { length: 24 }) }}
                    </q-badge>
                </div>
            </q-card-section>
        </q-card>
        <q-card class="my-card q-mb-sm" :style="qcardStyle">
            <q-card-section>
                <transition
                    appear
                    enter-active-class="animated fadeIn"
                    leave-active-class="animated fadeOut"
                    >
                    <div v-if="details">
                        <q-card-section>
                            <div class="text-h5 q-mt-sm q-mb-xs">
                                <FieldChangeTracker label="Title" :iri="iri" :og="details.title" :mut="updatePostTitle"/>
                                <FieldChangeTracker label="Author" :iri="iri" :og="details.author" :mut="updatePostAuthor"/>
                            </div>
                            <div class="col-auto text-white text-caption q-pt-md row no-wrap items-center">
                                <q-icon name="clock" />{{ details.version }}
                                <q-icon name="star" />{{ details.stars }}
                            </div>
                        </q-card-section>
                        <q-card-actions>
                            <q-btn flat :disable="isDeletedResource||(!isOnline)" color="primary" label="Delete" @click="deletePost" />
                            <q-btn flat :disable="isDeletedResource||(!isOnline)" color="primary" label="Like" @click="pushChanges(details.stars + 1)" />
                        </q-card-actions>
                    </div>
                </transition>
            </q-card-section>
            <q-inner-loading :showing="detailsQuery.fetching.value">
                <q-spinner-gears size="50px" dark color="primary" />
            </q-inner-loading>
        </q-card>
    </div>
</template>

<style>
q-card { color: white; }
</style>