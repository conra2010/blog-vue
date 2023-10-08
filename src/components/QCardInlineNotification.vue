<script setup lang="ts">
import { CombinedError } from '@urql/core';
import { toRefs, type Ref, computed } from 'vue';


const props = defineProps<{ error: Ref<any>, tag: string | undefined }>()

const { error, tag } = props

const msg = computed(() => {
    if (error.value) {
        return 'foo'
    }
    return 'bar'
})

</script>

<template>
    {{ msg }}
    <div v-if="(error instanceof CombinedError)">
        <q-card style="background-color: hsl(0, 0%, 25%);">
            <q-card-section>
                <p>Error ({{ error.name }})</p>
                <p>{{ error.message }}</p>
                <p>{{ tag }}</p>
            </q-card-section>
            <q-card-section>
                {{ JSON.stringify(error.networkError) }}
            </q-card-section>
            <q-card-section>
                <div v-for="(ex, i) in error.graphQLErrors" :key="i">
                    {{ JSON.stringify(ex) }}
                </div>
            </q-card-section>
         </q-card>
    </div>
    <div v-else>
        <q-card style="background-color: hsl(0, 0%, 25%);">
            <q-card-section>
                <p>Error Information</p>
                <p>{{ error.message }}</p>
            </q-card-section>
        </q-card>
    </div>
</template>