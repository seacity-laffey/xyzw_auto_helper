<template>
  <div aria-live="polite" aria-relevant="additions" class="message-region">
    <TransitionGroup name="message">
      <div
        v-for="message in appMessages"
        :key="message.id"
        class="message-item"
        :class="message.type"
        :role="message.type === 'error' ? 'alert' : 'status'"
      >
        <span class="message-indicator"></span>
        <span class="message-text">{{ message.text }}</span>
        <button
          aria-label="关闭提示"
          type="button"
          @click="dismissAppMessage(message.id)"
        >
          <X></X>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { X } from "@lucide/vue";
import { appMessages, dismissAppMessage } from "@/composables/useAppMessage";
</script>

<style scoped>
.message-region {
  position: fixed;
  inset: 16px 16px auto;
  z-index: 120;
  display: grid;
  justify-items: center;
  gap: 8px;
  pointer-events: none;
}

.message-item {
  display: grid;
  width: min(420px, 100%);
  min-height: 42px;
  grid-template-columns: 8px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 10px;
  padding: 8px 9px 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  pointer-events: auto;
}

.message-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted-foreground);
}

.message-item.success .message-indicator {
  background: var(--success);
}

.message-item.warning .message-indicator {
  background: var(--warning);
}

.message-item.error .message-indicator {
  background: var(--destructive);
}

.message-item.info .message-indicator {
  background: var(--info, var(--foreground));
}

.message-text {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.45;
}

.message-item button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 3px;
  color: var(--muted-foreground);
}

.message-item button:hover {
  background: var(--muted);
  color: var(--foreground);
}

.message-item svg {
  width: 14px;
  height: 14px;
}

.message-enter-active,
.message-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.message-enter-from,
.message-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .message-enter-active,
  .message-leave-active {
    transition: none;
  }
}
</style>
