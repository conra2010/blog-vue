<script setup lang="ts">
import { toRefs, type Ref } from 'vue';

interface SliceIt {
    dataFieldsValues: any[]|null,
    lastEventId: string,
    eventType: string
}

const props = defineProps<{ event: SliceIt }>()

//  component receives the Post IRI as prop
//const props = defineProps<{ dataFieldsValues: Ref<any[]|null>, lastEventId: Ref<string> }>()

const { dataFieldsValues, lastEventId, eventType } = toRefs(props.event)

</script>

<template>
    <p>{{ lastEventId }}</p>
    <p>{{ eventType }}</p>
    <p>{{ dataFieldsValues }}</p>
</template>