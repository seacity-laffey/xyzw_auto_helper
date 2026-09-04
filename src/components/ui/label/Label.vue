<template>
  <Label v-bind="props" :class="cn('text-sm font-medium leading-none text-foreground', props.class)">
    <slot></slot>
  </Label>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { LabelProps } from "reka-ui";
import { Label } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<LabelProps & { class?: HTMLAttributes["class"] }>();
</script>
