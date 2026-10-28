// inject.js —— 跑在页面主世界
(function () {
  console.log('injected')
  const TARGET = '/this-week.json';

  // 避免重复注入（页面热更新/多次执行时保护）
  if (window.__ARCHON_HOOKED__) return;
  window.__ARCHON_HOOKED__ = true;

  // 缓存上一次捕获的 hash，防止重复触发
  let lastHash = null;

  const setHash = (url) => {
    const match = url.match(/^\/_next\/data\/([\w-]+)\//);
    if (match?.[1] && match[1] !== lastHash) {
      lastHash = match[1];
      // 挂到 window，供 content script 读取
      window.__ARCHON_HASH__ = match[1];
      // 派发事件，content script 可精确监听
      window.dispatchEvent(
        new CustomEvent('__archon_hash__', { detail: match[1] })
      );
    }
  };

  // ── hook fetch ──
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const resp = await originalFetch(input, init);

    if (url.includes(TARGET)) {
      setHash(url);
    }
    return resp;
  };

  // ── hook XHR（兜底，Next.js 偶尔走 XHR）──
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__archon_url__ = typeof url === 'string' ? url : url.href;
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      if (this.__archon_url__?.includes(TARGET)) {
        setHash(this.__archon_url__);
      }
    });
    return originalSend.call(this, ...args);
  };
})();
