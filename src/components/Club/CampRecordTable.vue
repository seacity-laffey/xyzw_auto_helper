<template>
  <div class="overflow-auto">
    <table class="w-full text-left text-sm">
      <thead>
        <tr>
          <th>时间</th>
          <th>{{ defense ? "进攻成员" : "对手" }}</th>
          <th>结果（{{ defense ? "防守" : "进攻" }}方）</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in records"
          :key="row.recordName || index"
          class="border-t border-border"
        >
          <td class="py-2">{{ formatTime(row.created) }}</td>
          <td>
            {{
              row.name
                || row.targetRoleInfo?.name
                || row.targetName
                || row.roleId
                || "—"
            }}
          </td>
          <td>
            {{
              row.isWin === true
                ? "胜利"
                : row.isWin === false
                  ? "失败"
                  : "未知"
            }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!records?.length" class="py-3 text-sm text-muted-foreground">
      该比赛日暂无战报
    </p>
  </div>
</template>

<script setup>
defineProps({ records: Array, defense: Boolean });
const formatTime = (value) =>
  new Date(
    Number(value) < 1e12 ? Number(value) * 1000 : Number(value),
  ).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
</script>
