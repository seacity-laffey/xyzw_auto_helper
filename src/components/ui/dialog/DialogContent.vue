<template>
  <DialogPortal to="#app">
    <DialogOverlay class="fixed inset-0 z-[70] bg-black/50"></DialogOverlay>
    <DialogContent
      v-bind="forwarded"
      style="transform: translate(-50%, -50%)"
      :class="cn('fixed left-1/2 top-1/2 z-[71] grid w-[calc(100%-24px)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 text-foreground shadow-lg outline-none', props.class)"
    >
      <slot></slot>
      <DialogClose aria-label="关闭" class="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X class="h-4 w-4"></X>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { DialogContentEmits, DialogContentProps } from "reka-ui";
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui";
import { X } from "@lucide/vue";
import { cn } from "@/lib/utils";

const props = defineProps<DialogContentProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<DialogContentEmits>();
const forwarded = useForwardPropsEmits(props, emits);
</script>
