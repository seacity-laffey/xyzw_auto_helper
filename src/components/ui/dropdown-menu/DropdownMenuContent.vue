<template>
  <DropdownMenuPortal to="#app">
    <DropdownMenuContent
      v-bind="forwarded"
      data-slot="dropdown-menu-content"
      :class="cn('z-50 min-w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out', props.class)"
    >
      <slot></slot>
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { DropdownMenuContent, DropdownMenuPortal, useForwardProps } from "reka-ui";
import type { DropdownMenuContentProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<DropdownMenuContentProps & { class?: HTMLAttributes["class"] }>(),
  { sideOffset: 6 },
);
const forwarded = useForwardProps(props);
</script>
