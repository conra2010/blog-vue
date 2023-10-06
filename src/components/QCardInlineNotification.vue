<script setup lang="ts">
import type { CombinedError } from '@urql/core';
import { toRefs, type Ref } from 'vue';


const props = defineProps<{ error: Ref<CombinedError | undefined> }>()

const { error } = props

</script>

<template>
    <q-card style="background-color: hsl(0, 0%, 25%);">
        <q-card-section>
            <p>Error Information</p>
            <p>{{ error.message }}</p>
        </q-card-section>
    </q-card>
</template>