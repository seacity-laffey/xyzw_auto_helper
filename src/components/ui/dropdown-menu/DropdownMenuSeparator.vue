<template>
  <DropdownMenuSeparator v-bind="props" :class="cn('-mx-1 my-1 h-px bg-border', props.class)"></DropdownMenuSeparator>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { DropdownMenuSeparator } from "reka-ui";
import type { DropdownMenuSeparatorProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DropdownMenuSeparatorProps & { class?: HTMLAttributes["class"] }>();
</script>
