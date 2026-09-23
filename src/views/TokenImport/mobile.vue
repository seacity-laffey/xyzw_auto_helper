<template>
  <div class="mobile-login-import">
    <div class="login-flow-info">
      <h3>手机号验证码登录</h3>
      <ol class="flow-steps">
        <li>输入已绑定游戏账号的手机号并获取验证码</li>
        <li>输入短信验证码后登录</li>
        <li>选择需要添加的游戏角色</li>
      </ol>
      <NCheckbox v-model:checked="saveCombUser"
      >保存登录凭据以支持自动刷新</NCheckbox
      >
    </div>

    <NForm class="login-form" label-placement="top" :model="mobileForm">
      <NFormItem label="手机号">
        <NInput
          inputmode="numeric"
          maxlength="11"
          placeholder="请输入手机号"
          v-model:value="mobileForm.phone"
          :disabled="isLoggingIn"
        ></NInput>
      </NFormItem>
      <NFormItem label="短信验证码">
        <NInput
          inputmode="numeric"
          maxlength="6"
          placeholder="请输入验证码"
          v-model:value="mobileForm.code"
          :disabled="isLoggingIn"
          @keyup.enter="loginWithVerificationCode"
        >
          <template #suffix>
            <NButton
              text
              type="primary"
              :disabled="isLoggingIn || cooldownSeconds > 0"
              :loading="isSendingCode"
              @click="sendVerificationCode"
            >
              <template #icon
              ><NIcon><SendOutline></SendOutline></NIcon
              ></template>
              {{ cooldownSeconds > 0 ? `${cooldownSeconds}s` : "获取验证码" }}
            </NButton>
          </template>
        </NInput>
      </NFormItem>
    </NForm>

    <div class="form-actions login-actions">
      <NButton
        block
        type="primary"
        :disabled="!activeLoginMatchId"
        :loading="isLoggingIn"
        @click="loginWithVerificationCode"
      >
        <template #icon
        ><NIcon><LogInOutline></LogInOutline></NIcon
        ></template>
        登录并获取角色
      </NButton>
    </div>

    <NForm class="name-form" label-placement="top" :model="importForm">
      <NFormItem label="角色命名格式">
        <NInput
          placeholder="{name}-{index}-{id}"
          v-model:value="importForm.nameTemplate"
        ></NInput>
        <template #feedback>
          支持变量: {name}角色名, {id}角色ID, {index}角色序号, {server}区服
        </template>
      </NFormItem>
    </NForm>

    <ServerRoleList
      max-height="50vh"
      server-column-title="区服ID"
      :data="serverListData"
      @add="addSelectedRole"
      @download="handleDownload"
    ></ServerRoleList>

    <a-list>
      <a-list-item v-for="(role, index) in roleList" :key="role.id">
        <div class="role-row">
          <div>
            <strong>角色名称:</strong> {{ role.name }}<br >
            <strong>服务器:</strong> {{ role.server }}<br >
            <strong>角色序号:</strong> {{ role.roleIndex }}
          </div>
          <NButton size="small"
                   type="error"
                   @click="removeRole(index)"
          >删除</NButton
          >
        </div>
      </a-list-item>
    </a-list>

    <div class="form-actions">
      <NButton
        block
        size="large"
        type="primary"
        :loading="isImporting"
        @click="handleImport"
      >
        <template #icon
        ><NIcon><CloudUpload></CloudUpload></NIcon
        ></template>
        添加Token
      </NButton>
      <NButton
        block
        :disabled="isLoggingIn || isSendingCode"
        @click="$emit('cancel')"
      >
        <template #icon
        ><NIcon><Close></Close></NIcon
        ></template>
        取消
      </NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Close,
  CloudUpload,
  LogInOutline,
  SendOutline,
} from "@vicons/ionicons5";
import { NButton, NCheckbox, NForm, NFormItem, NIcon, NInput } from "naive-ui";
import ServerRoleList from "@/components/Token/ServerRoleList.vue";
import { useMobileTokenImport } from "@/composables/useMobileTokenImport";

const emit = defineEmits(["cancel", "ok"]);
const {
  mobileForm,
  importForm,
  isSendingCode,
  isLoggingIn,
  isImporting,
  cooldownSeconds,
  serverListData,
  roleList,
  activeLoginMatchId,
  saveCombUser,
  sendVerificationCode,
  loginWithVerificationCode,
  addSelectedRole,
  handleDownload,
  removeRole,
  handleImport,
} = useMobileTokenImport(emit);
</script>

<style scoped lang="scss">
.mobile-login-import {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) 0;
}
.login-flow-info {
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}
.login-flow-info h3 {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-md);
}
.flow-steps {
  margin: 0;
  padding-left: var(--spacing-lg);
  color: var(--text-secondary);
}
.flow-steps li {
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.login-form,
.name-form {
  margin-top: var(--spacing-xs);
}
.form-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.login-actions {
  margin-top: calc(var(--spacing-md) * -1);
}
.role-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}
</style>
