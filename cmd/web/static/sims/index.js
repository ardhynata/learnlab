// Lab loader. A lesson names its lab with `simulator: <key>`; the lab lives at
// sims/labs/<key>.js and exports mount(root) -> destroy(). There is no registry to
// edit: adding a lab means adding that one file (a test checks every lesson's key).
const KEY = /^[a-z0-9-]+$/;

export function loadLab(key) {
  if (!KEY.test(key)) return Promise.reject(new Error(`bad lab key: ${key}`));
  return import(`./labs/${key}.js`);
}
