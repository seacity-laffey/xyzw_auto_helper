<template>
  <DialogTitle v-bind="props" :class="cn('text-base font-semibold text-foreground', props.class)">
    <slot></slot>
  </DialogTitle>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { DialogTitleProps } from "reka-ui";
import { DialogTitle } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes["class"] }>();
</script>
