<template>
  <section class="status-card">
    <header class="card-header">
      <div class="status-icon"><slot name="icon"></slot></div>
      <div class="status-title"><slot name="title"></slot></div>
      <div class="status-badge" :class="statusClass">
        <span class="status-dot"></span>
        <slot name="badge"></slot>
      </div>
      <slot name="extra"></slot>
    </header>
    <div class="card-content"><slot></slot></div>
    <footer class="card-action" :class="statusClass"><slot name="action"></slot></footer>
  </section>
</template>

<script setup lang="ts">
type StatusKey = "active" | "weekly" | "energy" | "completed";

defineProps<{
  statusClass: StatusKey | Partial<Record<StatusKey, boolean>>;
}>();
</script>

<style lang="scss">
.status-card {
  display: flex;
  min-height: 168px;
  padding: 16px;
  flex-direction: column;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);

  .active,
  .completed {
    --status-color: var(--success);
  }

  .weekly {
    --status-color: var(--info);
  }

  .energy {
    --status-color: var(--warning);
  }

  .card-header {
    display: flex;
    margin-bottom: 14px;
    align-items: flex-start;
    gap: 10px;
  }

  .status-icon {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    object-fit: contain;

    > img,
    > svg {
      width: 30px;
      height: 30px;
      object-fit: contain;
    }
  }

  .status-title {
    min-width: 0;
    flex: 1;

    h3 {
      margin: 0 0 2px;
      color: var(--foreground);
      font-size: 14px;
      font-weight: 650;
    }

    p {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 12px;
    }
  }

  .status-badge {
    display: flex;
    min-height: 24px;
    padding: 0 7px;
    align-items: center;
    gap: 5px;
    color: var(--status-color, var(--muted-foreground));
    font-size: 12px;
    font-weight: 500;
    background: var(--muted);
    border-radius: 3px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    flex: 0 0 6px;
    background: currentColor;
    border-radius: 50%;
  }

  .card-content {
    min-width: 0;
    flex: 1;
    margin-bottom: 14px;
    color: var(--muted-foreground);
    font-size: 13px;

    h3 {
      margin: 0 0 4px;
      color: var(--foreground);
      font-size: 14px;
      font-weight: 600;
    }

    p {
      margin: 0;
    }
  }

  .card-action {
    display: flex;
    gap: 8px;

    > button {
      display: inline-flex;
      min-height: 34px;
      flex: 1;
      padding: 0 12px;
      align-items: center;
      justify-content: center;
      color: var(--primary-foreground);
      font-size: 13px;
      font-weight: 500;
      background: var(--primary);
      border-radius: var(--radius);
      transition: background 150ms ease, opacity 150ms ease;

      &:hover:not(:disabled) {
        background: var(--primary-hover);
      }

      &:disabled {
        color: var(--text-disabled);
        cursor: not-allowed;
        background: var(--muted);
      }
    }
  }
}

@media (max-width: 768px) {
  .status-card {
    min-height: auto;
    padding: 14px;

    .card-header {
      flex-wrap: wrap;
    }

    .status-title {
      min-width: 100px;
    }

    .status-badge {
      margin-left: auto;
    }
  }
}
</style>
