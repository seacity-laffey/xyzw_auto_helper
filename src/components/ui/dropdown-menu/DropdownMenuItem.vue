<template>
  <DropdownMenuItem
    v-bind="forwarded"
    data-slot="dropdown-menu-item"
    :class="cn('relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', props.class)"
  >
    <slot></slot>
  </DropdownMenuItem>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { DropdownMenuItem, useForwardProps } from "reka-ui";
import type { DropdownMenuItemProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DropdownMenuItemProps & { class?: HTMLAttributes["class"] }>();
const forwarded = useForwardProps(props);
</script>
