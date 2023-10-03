<script lang="ts" setup>
import { computed, ref, toRefs, type Ref,
    onBeforeMount, onBeforeUpdate,
    onMounted,
    onBeforeUnmount, onUnmounted } from 'vue';
import { gql, useMutation } from '@urql/vue'
import PostSummary from './PostSummary.vue';
import { useOnline, tryOnBeforeUnmount } from '@vueuse/core';

//  component receives the Post IRI as prop
const props = defineProps<{
    iri: string,
    rmref?: Set<string>,
    insref?: Set<string>,
}>()

const { iri, rmref, insref } = toRefs(props)

const isOnline = useOnline()

onBeforeMount(() => {
    console.log('on before mount')
})

onMounted(() => {
    console.log('on mounted')
})

onBeforeUpdate(() => {
    console.log('on before update')
})

onBeforeUnmount(() => {
    console.log('on before unmount')
})

onUnmounted(() => {
    console.log('on unmounted')
})

</script>

<template>

        <q-item style="width: 100%;">
            <PostSummary
                :iri="iri"
                :rmref="rmref" :insref="insref"
                />
        </q-item>

</template>