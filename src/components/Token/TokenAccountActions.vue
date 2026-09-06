<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        aria-label="更多操作"
        class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
        type="button"
      >
        <Ellipsis class="h-5 w-5"></Ellipsis>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <template v-for="action in actions" :key="action.key || 'separator'">
        <DropdownMenuSeparator v-if="action.type === 'divider'"></DropdownMenuSeparator>
        <DropdownMenuItem
          v-else
          :class="{ 'text-destructive': action.key === 'delete' }"
          @select="$emit('action', action.key)"
        >
          <component :is="action.icon" class="h-4 w-4"></component>
          {{ action.label }}
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup>
import { Copy, Ellipsis, Pencil, Trash2 } from "@lucide/vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

defineEmits(["action"]);

const actions = [
  { icon: Pencil, key: "edit", label: "编辑" },
  { icon: Copy, key: "copy", label: "复制Token" },
  { type: "divider" },
  { icon: Trash2, key: "delete", label: "删除" },
];
</script>
