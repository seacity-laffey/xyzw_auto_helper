<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          size="icon"
          variant="ghost"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleTheme"
        >
          <Sun v-if="isDark"></Sun>
          <Moon v-else></Moon>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{{ isDark ? "浅色模式" : "深色模式" }}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup>
import { Moon, Sun } from "@lucide/vue";
import { useTheme } from "@/composables/useTheme";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const { isDark, toggleTheme } = useTheme();
</script>
