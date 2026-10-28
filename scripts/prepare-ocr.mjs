import { cp, mkdir, readdir } from "node:fs/promises";
// Serve the worker, WASM and English model from our own origin; photos never leave the device.
const dest = "public/ocr";
await mkdir(dest, { recursive: true });
await cp(
  "node_modules/tesseract.js/dist/worker.min.js",
  `${dest}/worker.min.js`,
);
for (const name of await readdir("node_modules/tesseract.js-core")) {
  if (name.endsWith(".wasm.js") || name.endsWith(".wasm"))
    await cp(`node_modules/tesseract.js-core/${name}`, `${dest}/${name}`);
}
await cp(
  "node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz",
  `${dest}/eng.traineddata.gz`,
);
