<template>
  <TooltipProvider v-bind="props"><slot></slot></TooltipProvider>
</template>

<script setup lang="ts">
import { TooltipProvider } from "reka-ui";
import type { TooltipProviderProps } from "reka-ui";

const props = withDefaults(defineProps<TooltipProviderProps>(), { delayDuration: 300 });
</script>
