<template>
  <Button
    size="sm"
    variant="outline"
    :disabled="disabled || busy"
    @click="openDialog"
  >购买</Button
  >
  <Dialog :open="open"
          @update:open="!busy && (open = $event)"
  ><DialogContent
  ><DialogHeader
   ><DialogTitle>购买{{ weird ? "怪异塔" : "咸将塔" }}小鱼干</DialogTitle
   ><DialogDescription
   >消耗金砖购买，数量 1–100 份。</DialogDescription
   ></DialogHeader
   >
    <Input
      aria-label="购买份数"
      max="100"
      min="1"
      type="number"
      v-model="quantity"
    ></Input>
    <DialogFooter
    ><Button variant="outline"
             :disabled="busy"
             @click="open = false"
    >取消</Button
    ><Button :disabled="busy || disabled || !valid" @click="purchase">{{
      busy ? "购买中…" : "确认购买"
    }}</Button></DialogFooter
    >
  </DialogContent></Dialog
  >
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildTowerEnergyPurchase } from "@/utils/towerEnergyPurchase.js";

const props = defineProps({ weird: Boolean, disabled: Boolean });
const emit = defineEmits(["purchased", "busy"]);
const store = useTokenStore();
const message = useMessage();
const quantity = ref(1);
const busy = ref(false);
const open = ref(false);
const ownerId = ref(null);
const valid = computed(
  () =>
    Number.isInteger(Number(quantity.value))
    && quantity.value >= 1
    && quantity.value <= 100,
);
const openDialog = () => {
  ownerId.value = store.selectedToken?.id;
  quantity.value = 1;
  open.value = true;
};
watch(
  () => store.selectedToken?.id,
  () => {
    open.value = false;
  },
);
const purchase = async () => {
  const id = ownerId.value;
  if (
    !id
    || id !== store.selectedToken?.id
    || busy.value
    || props.disabled
    || !valid.value
  ) {
    return;
  }
  busy.value = true;
  emit("busy", true);
  try {
    const { cmd, params } = buildTowerEnergyPurchase(
      props.weird,
      quantity.value,
    );
    await store.sendMessageWithPromise(id, cmd, params, 10000);
    if (id === store.selectedToken?.id) {
      emit("purchased");
      open.value = false;
      message.success("购买成功");
    }
  } catch (e) {
    message.error(e.message || "购买失败");
  } finally {
    busy.value = false;
    emit("busy", false);
  }
};
</script>
