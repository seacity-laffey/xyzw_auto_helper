<template>
  <section class="space-y-2">
    <Button
      size="sm"
      variant="outline"
      :disabled="loading || exporting || !sorted.length"
      @click="exportReport"
    >{{ exporting ? "导出中…" : "导出统计图片" }}</Button
    >
    <div ref="report" class="overflow-auto bg-card p-3">
      <p class="mb-3 text-sm">{{ caption }}</p>
      <table class="w-full whitespace-nowrap text-left text-sm">
        <thead>
          <tr>
            <th>据点</th>
            <th>成员</th>
            <th>战力</th>
            <th>战功</th>
            <th>进攻成功/次数</th>
            <th>守住/被攻次数</th>
            <th>防守胜率</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="member in sorted"
            :key="member.key"
            class="border-t border-border"
          >
            <td class="py-3">{{ member.slot }}</td>
            <td>
              {{ member.mirror ? "[镜像] " : "" }}{{ member.name }}
              <span v-if="member.defeated"
                    class="text-muted-foreground"
              >已击败</span
              >
            </td>
            <td>{{ (Number(member.power || 0) / 1e8).toFixed(2) }}亿</td>
            <td>{{ member.score ?? "—" }}</td>
            <td>{{ member.attacks }}</td>
            <td>{{ member.defenseWins }}/{{ member.defenseCount }}</td>
            <td>{{ member.defenseRate }}</td>
            <td>
              <Button
                size="sm"
                variant="outline"
                @click="$emit('detail', member)"
              >防守流水</Button
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!sorted.length" class="py-4 text-sm text-muted-foreground">
        暂无据点数据
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import { Button } from "@/components/ui/button";

const props = defineProps({
  members: Array,
  sort: String,
  onlyAlive: Boolean,
  caption: String,
  loading: Boolean,
});
defineEmits(["detail"]);
const report = ref(null);
const exporting = ref(false);
const message = useMessage();
const exportReport = async () => {
  if (!report.value || exporting.value)
    return;
  exporting.value = true;
  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(report.value, {
      useCORS: true,
      scale: 2,
      width: report.value.scrollWidth,
      windowWidth: Math.max(window.innerWidth, report.value.scrollWidth),
    });
    downloadCanvasAsImage(canvas, `营地统计-${Date.now()}.png`);
  } catch (error) {
    message.error(error.message || "导出失败");
  } finally {
    exporting.value = false;
  }
};
const sorted = computed(() =>
  [...(props.members || [])]
    .filter((m) => !props.onlyAlive || !m.defeated)
    .sort((a, b) =>
      props.sort === "power"
        ? Number(b.power || 0) - Number(a.power || 0)
        : props.sort === "score"
          ? Number(b.score || 0) - Number(a.score || 0)
          : Number(a.slot) - Number(b.slot),
    ),
);
</script>
