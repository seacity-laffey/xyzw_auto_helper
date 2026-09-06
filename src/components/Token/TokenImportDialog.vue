<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>添加游戏 Token</DialogTitle>
        <DialogDescription class="sr-only">选择一种 Token 导入方式</DialogDescription>
      </DialogHeader>
      <div class="mb-8 flex justify-center max-md:mb-5">
        <div class="flex overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest max-md:hidden">
          <button
            v-for="option in importMethodOptions"
            :key="option.value"
            class="border-r border-outline-variant px-3 py-2 text-body-sm font-medium transition-colors last:border-r-0"
            type="button"
            :class="importMethod === option.value ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
            @click="importMethod = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <select aria-label="Token 导入方式" class="hidden w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary max-md:block" v-model="importMethod">
          <option v-for="option in importMethodOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
      <ManualTokenForm v-if="importMethod === 'manual'" @cancel="close" @ok="close"></ManualTokenForm>
      <WxQrcodeForm v-else-if="importMethod === 'wxQrcode'" @cancel="close" @ok="close"></WxQrcodeForm>
      <BinTokenForm v-else-if="importMethod === 'bin'" @cancel="close" @ok="close"></BinTokenForm>
      <SingleBinTokenForm v-else @cancel="close" @ok="close"></SingleBinTokenForm>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref } from "vue";
import BinTokenForm from "@/views/TokenImport/bin.vue";
import ManualTokenForm from "@/views/TokenImport/manual.vue";
import SingleBinTokenForm from "@/views/TokenImport/singlebin.vue";
import WxQrcodeForm from "@/views/TokenImport/wxqrcode.vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(["update:open"]);

const importMethod = ref("manual");
const importMethodOptions = [
  { label: "手动输入", value: "manual" },
  { label: "微信扫码", value: "wxQrcode" },
  { label: "BIN 多角色", value: "bin" },
  { label: "BIN 单角色", value: "singlebin" },
];
const close = () => emit("update:open", false);
</script>
