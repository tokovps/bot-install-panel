(() => {
  const menuButton = document.querySelector('[data-menu-button]');
  const menu = document.querySelector('[data-menu]');
  menuButton?.addEventListener('click', () => menu?.classList.toggle('open'));

  const sidebar = document.querySelector('[data-sidebar]');
  const backdrop = document.querySelector('[data-sidebar-backdrop]');
  const closeSidebar = () => { sidebar?.classList.remove('open'); backdrop?.classList.remove('open'); };
  document.querySelector('[data-sidebar-button]')?.addEventListener('click', () => {
    sidebar?.classList.add('open'); backdrop?.classList.add('open');
  });
  backdrop?.addEventListener('click', closeSidebar);

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = 'Tersalin ✓';
      } catch {
        const text = document.createElement('textarea');
        text.value = button.dataset.copy;
        document.body.appendChild(text); text.select(); document.execCommand('copy'); text.remove();
        button.textContent = 'Tersalin ✓';
      }
      setTimeout(() => { button.textContent = original; }, 1800);
    });
  });

  const checkout = document.querySelector('[data-checkout]');
  if (checkout && checkout.dataset.status === 'pending') {
    const publicId = checkout.dataset.publicId;
    const poll = async () => {
      try {
        const response = await fetch(`/api/public/payments/${publicId}/status`, { headers: { Accept: 'application/json' } });
        const json = await response.json();
        if (!json.success) return;
        if (json.data.status !== 'pending') window.location.reload();
      } catch { /* retry on next interval */ }
    };
    setInterval(poll, 5000);
    setTimeout(poll, 1200);
  }
})();
