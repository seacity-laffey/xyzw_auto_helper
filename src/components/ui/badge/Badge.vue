<template>
  <div data-slot="badge" :class="cn(badgeVariants({ variant: props.variant }), props.class)">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { badgeVariants } from ".";
import type { BadgeVariants } from ".";

const props = defineProps<{
  variant?: BadgeVariants["variant"];
  class?: HTMLAttributes["class"];
}>();
</script>
