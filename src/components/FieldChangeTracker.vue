<script setup lang="ts">
import { ref, watch, computed, toRefs } from 'vue';
import { gql, useMutation, useQuery, useSubscription, type TypedDocumentNode } from '@urql/vue'
import { useOnline } from '@vueuse/core';
import { useQuasar } from 'quasar';

const $q = useQuasar()

//  we get the ID of the resource, a label and value, and a GraphQL mutation to
//  change the field
//
const props = defineProps<{ iri: string, label: string, og: string, mut: TypedDocumentNode }>()

const { iri, label, og } = toRefs(props)

const isOnline = useOnline()

//  copy original value to another ref, model for the input 
const uv = ref(og.value)

const conflict = ref(false)

//  if the original value changes
watch(og, () => {
    //  and we are not editing, just copy the new value
    if (!isEditing.value) {
        uv.value = og.value
    } else {
        //  if values are different, there's a conflict
        if (uv.value !== og.value) {
            hintOnConflict.value = 'Another user just changed this field to ' + og.value
            conflict.value = true
        }
    }
})

const isEditing = ref(false)

//  TODO find a way to pass GraphQL mutations around
const updateFieldMutation = useMutation(props.mut)

function executeUpdateFieldMutation() {
    updateFieldMutation.executeMutation({
        id:iri.value, fvalue:uv.value
    }).then(result => {
        console.log('updateFieldMutation.exec: result: ', result)

        if (result.error) {
            $q.notify({ message: 'Failed to save changes', type: 'error', closeBtn: true, timeout: 10000 })
            conflict.value = true
        }
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

function handleFocusGained() {
    isEditing.value = true
}

function handleFocusLost() {
    //  if we have a new value in the input
    if (uv.value !== og.value) {
        //  use the GraphQL mutation to send it to the API
        console.log('update:', og.value, ' => ', uv.value);
        //executeUpdatePost()
        executeUpdateFieldMutation()
    }
    //  back to ...
    isEditing.value = false
    conflict.value = false
}

//  TODO handle conflicts, etc.
function handleAcceptTruth() {
    uv.value = og.value
    conflict.value = false
}

function handleCancelEdit() {
    uv.value = og.value
    conflict.value = false
    isEditing.value = false
}

const qInputColor = computed(() => {
    if (isEditing.value) {
        if (conflict.value) {
            return "accent"
        }
        return "white"
    }
    return "lightgray"
})

const hintOnConflict = ref('')

</script>

<template>
    <div>
        <q-input v-if="!conflict"
            filled v-model="uv" @blur="handleFocusLost" 
            :label="label" @focus="handleFocusGained" dark :label-color="qInputColor"
            />
        <q-input v-else
            filled bottom-slots v-model="uv" @blur="handleFocusLost" 
            :label="label" @focus="handleFocusGained" dark :label-color="qInputColor"
            >
            <template v-slot:prepend>
                <q-icon name="warning" />
            </template>
            <template v-slot:append>
                <q-icon name="close" @click="handleCancelEdit" class="cursor-pointer" />
            </template>

            <template v-slot:hint>{{ hintOnConflict }}</template>
        </q-input>

        <!-- <q-input :disable="!isOnline" filled v-model="uv" label-color="white" :label="label" @blur="handleFocusLost" @focus="handleFocusGained" dark :label-color="qInputColor"/> -->
        <!-- <div v-if="conflict">
            Conflict: {{ og }}
            <q-btn flat label="Cancel" @click="handleCancelEdit" />
            <q-btn flat label="Replace" @click="handleAcceptTruth" />
        </div> -->
    </div>
    <!-- <q-btn label-color="white" label="(sim focus lost)" @click="handleFocusLost" /> -->
</template>

<style>
input {
    font-size: max(1em, 16px);
}

.content { color: hsl(0, 0%, 75%); }

.conflict { color: hsl(32, 51%, 51%); }

.edition { color: hsl(144, 39%, 48%); }

.default { color: hsl(0, 0%, 76%); }

</style>