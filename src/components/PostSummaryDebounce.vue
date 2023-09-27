<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import { reactiveComputed, refDebounced, watchDebounced } from '@vueuse/core';
import { gql, useMutation, useQuery, useSubscription } from '@urql/vue'

const props = defineProps<{ pre: SliceIt }>()

//  component receives the Post IRI as prop

//const props = defineProps<{ dataFieldsValues: Ref<any[]|null>, lastEventId: Ref<string> }>()

const { iri, title, author } = toRefs(props.pre)

const tx = refDebounced(title, 1000)


function updateTitle() { updateTitleMutation.executeMutation({id:iri.value,title:tx.value}).then(result => {
    console.log('updateTitleMutation.executeMutation: result: ', result)
}) }

const updateTitleTDN = gql`mutation UpdateTitle($id:ID!,$title:String!) {
    updatePost (input:{id:$id,clientMutationId:"TDN01",title:$title}) { clientMutationId }
}`

const updateTitleMutation = useMutation(updateTitleTDN)

watchDebounced(props, () => {
    console.log('go: ', props.pre)
    // updateTitle()
})

</script>

<template>
    <p>{{ props }}</p>
</template>