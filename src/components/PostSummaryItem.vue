<script lang="ts" setup>
import { computed, ref, toRefs, type Ref } from 'vue';
import { gql, useMutation } from '@urql/vue'
import PostSummary from './PostSummary.vue';
import { useOnline } from '@vueuse/core';

//  component receives the Post IRI as prop
const props = defineProps<{
    iri: string,
    rmref?: Set<string>,
    insref?: Set<string>,
}>()

const { iri, rmref, insref } = toRefs(props)

const isOnline = useOnline()

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


let timer

function finalize(reset) {
    timer = setTimeout(() => {
        reset()
    }, 3000)
}
function onLeft({ reset }) {
    finalize(reset)
}

function onRight({ reset }) {
    finalize(reset)
}

</script>

<template>
    {{ isOnline }}
    <q-slide-item dark @left="onLeft" right-color="red" @right="onRight">
        <template v-slot:left>
            <div class="row items-center">
                <q-icon left name="done" /> Left
            </div>
        </template>
        <template v-slot:right>
            <div class="row items-center">
                <q-btn label="Delete" @click="deletePost" />
                <!-- <q-icon right name="alarm" /> -->
            </div>
        </template>
        <q-item style="width: 100%;">
            <PostSummary
                :iri="iri"
                :rmref="rmref" :insref="insref"
                />
        </q-item>
    </q-slide-item>
</template>