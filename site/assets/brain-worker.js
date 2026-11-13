/* MARSAI AI Brain worker: a small open model (Qwen2.5-0.5B-Instruct, Apache-2.0) that runs in this
 * browser via transformers.js. No key, no server. Opt-in: loaded only after the captain enables it.
 * The library is pinned and loaded from jsDelivr; model files come from huggingface.co and are cached. */
import { pipeline, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6';

const MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
let gen = null, device = 'wasm', busy = false;

function progress(p) {
  if (p.status === 'progress' && p.total) postMessage({ type: 'progress', pct: Math.round((p.loaded / p.total) * 100), file: p.file });
}
async function load() {
  const tries = [];
  if (self.navigator && navigator.gpu) tries.push(['webgpu', 'q4f16']);
  tries.push(['wasm', 'q4']);
  let last = null;
  for (const [dev, dtype] of tries) {
    try {
      gen = await pipeline('text-generation', MODEL, { device: dev, dtype, progress_callback: progress });
      device = dev;
      postMessage({ type: 'ready', device: dev });
      return;
    } catch (e) { last = e; }
  }
  postMessage({ type: 'error', message: String(last && last.message || last) });
}
async function chat(id, messages) {
  if (!gen) { postMessage({ type: 'error', id, message: 'brain not loaded' }); return; }
  if (busy) { postMessage({ type: 'error', id, message: 'brain busy' }); return; }
  busy = true;
  try {
    const streamer = new TextStreamer(gen.tokenizer, { skip_prompt: true, skip_special_tokens: true,
      callback_function: (t) => postMessage({ type: 'token', id, text: t }) });
    const out = await gen(messages, { max_new_tokens: 110, do_sample: true, temperature: 0.7, top_p: 0.9,
      repetition_penalty: 1.1, streamer });
    postMessage({ type: 'done', id, text: out[0].generated_text.at(-1).content.trim() });
  } catch (e) { postMessage({ type: 'error', id, message: String(e && e.message || e) }); }
  busy = false;
}
onmessage = (e) => {
  const m = e.data;
  if (m.type === 'load') load();
  else if (m.type === 'chat') chat(m.id, m.messages);
};
