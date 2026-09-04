<template>
  <DropdownMenuLabel v-bind="props" :class="cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', props.class)">
    <slot></slot>
  </DropdownMenuLabel>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { DropdownMenuLabel } from "reka-ui";
import type { DropdownMenuLabelProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DropdownMenuLabelProps & { class?: HTMLAttributes["class"] }>();
</script>
