<template>
  <TooltipPortal to="#app">
    <TooltipContent
      v-bind="forwarded"
      :class="cn('z-50 rounded-sm bg-primary px-2.5 py-1.5 text-xs text-primary-foreground shadow-md', props.class)"
    >
      <slot></slot>
    </TooltipContent>
  </TooltipPortal>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { TooltipContent, TooltipPortal, useForwardProps } from "reka-ui";
import type { TooltipContentProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<TooltipContentProps & { class?: HTMLAttributes["class"] }>(),
  { sideOffset: 6 },
);
const forwarded = useForwardProps(props);
</script>
