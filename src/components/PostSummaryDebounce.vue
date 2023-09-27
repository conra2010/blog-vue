<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import { reactiveComputed, refDebounced, syncRef, watchDebounced } from '@vueuse/core';
import { gql, useMutation, useQuery, useSubscription } from '@urql/vue'

const props = defineProps<{ iri: string, title: string, linked: boolean }>()

//  component receives the Post IRI as prop
//const props = defineProps<{ dataFieldsValues: Ref<any[]|null>, lastEventId: Ref<string> }>()

const { iri, title, linked } = toRefs(props)

const uref = ref(title.value)

const fy = refDebounced(uref, 1000)

// const dbTitle = refDebounced(title, 1000)

function executeUpdatePost() {
    updatePostMutation.executeMutation({
        id:iri,
        title:title
    }).then(result => {
        console.log('updateTitleMutation.executeMutation: result: ', result)
    })
}

const updatePostTDN = gql`mutation UpdatePost($id:ID!,$title:String!) {
    updatePost (input:{id:$id,clientMutationId:"urn:blog-vue:64a8ff25",
        title:$title,
    }) { clientMutationId }
}`

const updatePostMutation = useMutation(updatePostTDN)

const userEditedValue = ref(false)

watch(fy, () => {
    if (linked.value) {
        console.log('go: ', fy.value)
    }
})

    //executeUpdatePost()
</script>

<template>
    <q-input v-model="uref" filled label="uref" />
</template>