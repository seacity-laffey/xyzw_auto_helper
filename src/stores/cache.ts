
// create by elishell <75950346@qq.com>
import type { App } from "vue";

const _timeout = 5 * 1000;

type CacheKey = string | number | symbol;
type CacheCallback = (
  key: CacheKey,
  config: CacheConfig,
) => unknown | Promise<unknown>;
type DeferredHandler = (data: unknown) => void;

interface CacheConfig {
  content: Content<CacheItem>;
  timeout: number;
}

const key = Symbol("key");
const val = Symbol("val");
const timeout = Symbol("timeout");
const ok = Symbol("ok");
const reject = Symbol("reject");
const reslove = Symbol("reslove");
const config = Symbol("config");

declare global {
  interface Window {
    $CacheManager: CacheManager;
  }
}

class Content<T = CacheItem> {
  [key: string]: T | undefined;
  [key: number]: T | undefined;
  [key: symbol]: T | undefined;
}

class CacheItem {
  [key]: CacheKey;
  [val]: unknown;
  [timeout]: number;
  [ok]: boolean;
  [reject]: DeferredHandler[];
  [reslove]: DeferredHandler[];

  constructor(_key: CacheKey, _val: unknown, _t = _timeout) {
    this[key] = _key;
    this[val] = _val;
    this[timeout] = +new Date() + _t;
    this[ok] = false;

    this[reject] = [];
    this[reslove] = [];
  }

  get reject() {
    return this[reject];
  }

  get reslove() {
    return this[reslove];
  }

  get timeout() {
    return this[timeout];
  }

  get key() {
    return this[key];
  }

  set val(data: unknown) {
    this[ok] = true;
    this[val] = data;
  }

  get val() {
    return this[val];
  }

  toJSON() {
    return {
      key: this[key],
      val: this[val],
      timeout: this[timeout],
    };
  }

  isTimeout() {
    return this[timeout] < +new Date();
  }

  isOk() {
    return this[ok];
  }
}

class Cache {
  name: string;
  content: Content<CacheItem>;
  [config]: CacheConfig;

  constructor(
    name: string,
    { content = new Content<CacheItem>(), timeout = _timeout }: Partial<CacheConfig> = {},
  ) {
    this.name = name;
    this.content = content;
    this[config] = {
      content,
      timeout,
    };
  }

  async get(
    keyValue: CacheKey,
    callback: CacheCallback | unknown,
    conf?: Partial<CacheConfig>,
  ) {
    const item = this.content[keyValue];
    // 没有 初始化
    if (item != null) {
      if (!item.isOk()) {
        return new Promise((reslove, reject) => {
          item.reslove.push(reslove);
          item.reject.push(reject);
        });
      }
      if (!item.isTimeout()) {
        return item.val;
      }
    }
    return this.feach(keyValue, callback, {
      ...this[config],
      ...conf,
    });
  }

  async feach(
    keyValue: CacheKey,
    callback: CacheCallback | unknown,
    conf: CacheConfig = this[config],
  ) {
    const oldItem = this.content[keyValue];
    const newItem = new CacheItem(keyValue, null, conf.timeout);
    this.content[keyValue] = newItem;
    let data: unknown;
    if (callback instanceof Function || callback instanceof Promise) {
      try {
        data =
          callback instanceof Promise
            ? await callback
            : await callback(keyValue, conf);
        oldItem && oldItem.reslove.map((f) => f && f(data));
        newItem && newItem.reslove.map((f) => f && f(data));
      } catch (e) {
        console.error(`${this.name}-${String(keyValue)}: the ajax request is failed : ${e}`);
        oldItem && oldItem.reject.map((f) => f && f(data));
        newItem && newItem.reject.map((f) => f && f(data));
      }
    } else {
      data = callback;
      oldItem && oldItem.reslove.map((f) => f && f(data));
      newItem && newItem.reslove.map((f) => f && f(data));
    }
    oldItem && ((oldItem.reject.length = 0), (oldItem.reslove.length = 0));
    newItem && ((newItem.reject.length = 0), (newItem.reslove.length = 0));
    return (newItem.val = data);
  }

  clean(content = new Content<CacheItem>()) {
    this.content = content;
  }
}

class CacheManager {
  content: Content<Cache>;
  timeout: number;

  constructor(content = new Content<Cache>(), timeout = _timeout) {
    this.content = content;
    this.timeout = timeout;
  }

  getCache(name: string, cacheConfig?: Partial<CacheConfig>) {
    let cache = this.content[name];
    if (cache == null) {
      this.content[name] = cache = new Cache(name, {
        timeout: this.timeout,
        ...cacheConfig,
      });
    } else {
      cacheConfig?.timeout && (cache[config].timeout = cacheConfig.timeout);
    }
    return cache;
  }

  delCache(name: string) {
    delete this.content[name];
  }

  clear() {
    this.content = new Content<Cache>();
  }
}

const $CacheManager = new CacheManager();

const install = (vm: App) => {
  if (vm.version.startsWith("3.")) {
    vm.config.globalProperties.$CacheManager = $CacheManager;
  } else {
    const legacyApp = vm as App & { prototype?: Record<string, unknown> };
    if (legacyApp.prototype) {
      legacyApp.prototype.$CacheManager = $CacheManager;
    }
  }
};

window.$CacheManager = $CacheManager;

export { $CacheManager, Content, CacheManager, Cache, install };
