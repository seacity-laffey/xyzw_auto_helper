try {
  const theme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (theme === 'dark' || (theme !== 'light' && prefersDark)) document.documentElement.setAttribute('data-theme', 'dark');
} catch { /* 存储不可用时使用默认主题。 */ }
