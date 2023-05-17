import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { RustBridge } = require("../../rust-workers/rust-workers.node");

let bridge = new RustBridge();

export default bridge;