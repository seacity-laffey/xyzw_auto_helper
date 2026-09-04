<template>
  <DropdownMenuTrigger v-bind="props"><slot></slot></DropdownMenuTrigger>
</template>

<script setup lang="ts">
import { DropdownMenuTrigger } from "reka-ui";
import type { DropdownMenuTriggerProps } from "reka-ui";

const props = defineProps<DropdownMenuTriggerProps>();
</script>
