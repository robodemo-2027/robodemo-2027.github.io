(() => {
  let theme;
  try { theme = localStorage.getItem('robodemo-theme'); } catch {}
  if (!['light', 'dark'].includes(theme)) {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
})();
