<template>
  <Separator
    data-slot="separator"
    v-bind="props"
    :class="cn('shrink-0 bg-border', props.orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', props.class)"
  ></Separator>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { Separator } from "reka-ui";
import type { SeparatorProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<SeparatorProps & { class?: HTMLAttributes["class"] }>(),
  {
    orientation: "horizontal",
    decorative: true,
  },
);
</script>
