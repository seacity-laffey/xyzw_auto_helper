<template>
  <DialogPortal to="#app">
    <DialogOverlay class="fixed inset-0 z-[60] bg-black/50"></DialogOverlay>
    <DialogContent
      v-bind="forwarded"
      :class="cn('fixed inset-y-0 left-0 z-[61] h-full w-[min(272px,86vw)] border-r border-border bg-background shadow-lg outline-none', props.class)"
    >
      <slot></slot>
    </DialogContent>
  </DialogPortal>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { DialogContentEmits, DialogContentProps } from "reka-ui";
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DialogContentProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<DialogContentEmits>();
const forwarded = useForwardPropsEmits(props, emits);
</script>
