<script setup lang="ts">
import { ref, watch, toRefs } from 'vue';
import { gql, useMutation, useQuery, useSubscription, type TypedDocumentNode } from '@urql/vue'

const props = defineProps<{ iri: string, og: string, mut: TypedDocumentNode }>()

const { iri, og } = toRefs(props)

const uv = ref(og.value)

const conflict = ref(false)

watch(og, () => {
    if (!isEditing.value) {
        uv.value = og.value
    } else {
        if (uv.value !== og.value) {
            conflict.value = true
        }
    }
})

const isEditing = ref(false)

const updateFieldMutation = useMutation(props.mut)

function executeUpdateFieldMutation() {
    updateFieldMutation.executeMutation({
        id:iri.value, fvalue:uv.value
    }).then(result => {
        console.log('updateFieldMutation.exec: result: ', result)
    })
}

// function executeUpdatePost() {
//     updatePostMutation.executeMutation({
//         id:iri.value,
//         title:uv.value
//     }).then(result => {
//         console.log('updateTitleMutation.executeMutation: result: ', result)
//     })
// }

// const updatePostTDN = gql`mutation UpdatePost($id:ID!,$title:String!) {
//     updatePost (input:{id:$id,clientMutationId:"urn:blog-vue:64a8ff25",
//         title:$title,
//     }) { clientMutationId }
// }`

// const updatePostMutation = useMutation(updatePostTDN)

function handleFocusLost() {
    if (uv.value !== og.value) {
        console.log('update:', og.value, ' => ', uv.value);
        //executeUpdatePost()
        executeUpdateFieldMutation()
    }
    isEditing.value = false
    conflict.value = false
}

function handleAcceptTruth() {
    uv.value = og.value
    conflict.value = false
}

</script>

<template>
    <pre>{{ isEditing }}</pre>
    <q-input filled readonly v-model="og" label="Truth" style="background-color: beige;"/>
    <q-input filled v-model="uv" label="Field" @focus="isEditing = true"/>
    <q-btn flat color="secondary" label="(blur)" @click="handleFocusLost" />
    <div v-if="conflict">
        <q-input filled readonly v-model="og" label="Conflict" style="background-color: lightcoral;"/>
        <q-btn flat color="secondary" label="Accept" @click="handleAcceptTruth" />
    </div>
</template>