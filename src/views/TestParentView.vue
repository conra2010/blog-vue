<script setup lang="ts">
import { ref } from 'vue'
import TestChild from '@/components/TestChild.vue';

const strref = ref('test parent str ref initial content')
</script>

<template>
    <div class="test-parent">
        <p>Test Parent Content</p>
        <p>strref: {{ strref }}</p>
        <q-card class="my-card text-white q-mb-sm">
            <q-card-section>
                <div class="text-h5 q-mt-sm q-mb-xs">
                    <q-input v-model="strref" filled label="Parent ref()" placeholder="ref('some string value')" />
                </div>
            </q-card-section>
        </q-card>
        <TestChild :strval="strref"/>
        <br>
    </div>
</template>