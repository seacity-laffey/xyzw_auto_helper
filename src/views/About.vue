<template>
  <article class="about-page">
    <p>本项目基于以下上游仓库修改开发：</p>
    <a rel="noopener noreferrer" target="_blank" :href="upstreamUrl" @click="openLink($event, upstreamUrl)">
      w1249178256 / xyzw_web_helper <ExternalLink :size="14"></ExternalLink>
    </a>
    <p v-if="linkError" role="status">{{ linkError }}</p>
  </article>
</template>

<script setup>
import { ref } from "vue";
import { ExternalLink } from "@lucide/vue";

const isDesktop = window.desktop?.isDesktop === true;
const upstreamUrl = "https://github.com/w1249178256/xyzw_web_helper";
const linkError = ref("");
const openLink = async (event, url) => {
  if (!isDesktop)
    return;
  event.preventDefault();
  linkError.value = "";
  try {
    await window.desktop.openAboutLink(url);
  } catch {
    linkError.value = "无法打开浏览器，请复制链接后访问";
  }
};
</script>

<style scoped>
.about-page { padding: 24px; color: var(--foreground); font-size: 14px; line-height: 1.8; }
p { margin: 0 0 8px; color: var(--muted-foreground); }
a { color: var(--foreground); overflow-wrap: anywhere; text-decoration: underline; text-underline-offset: 3px; }
a svg { display: inline; vertical-align: middle; margin-left: 4px; }
</style>
