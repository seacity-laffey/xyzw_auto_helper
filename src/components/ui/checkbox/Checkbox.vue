<template>
  <CheckboxRoot
    v-bind="forwarded"
    :class="cn('peer grid h-4 w-4 shrink-0 place-items-center rounded-sm border border-input bg-background text-primary-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary', props.class)"
  >
    <CheckboxIndicator class="grid place-items-center">
      <Minus v-if="props.modelValue === 'indeterminate'" class="h-3.5 w-3.5"></Minus>
      <Check v-else class="h-3.5 w-3.5"></Check>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { CheckboxRootEmits, CheckboxRootProps } from "reka-ui";
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from "reka-ui";
import { Check, Minus } from "@lucide/vue";
import { cn } from "@/lib/utils";

const props = defineProps<CheckboxRootProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<CheckboxRootEmits>();
const forwarded = useForwardPropsEmits(props, emits);
</script>
