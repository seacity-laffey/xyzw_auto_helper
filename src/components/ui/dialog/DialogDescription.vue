<template>
  <DialogDescription v-bind="props" :class="cn('text-sm text-muted-foreground', props.class)">
    <slot></slot>
  </DialogDescription>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { DialogDescriptionProps } from "reka-ui";
import { DialogDescription } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes["class"] }>();
</script>
