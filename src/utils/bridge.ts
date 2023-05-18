import { createRequire } from "module";
import { RustBridge as Bridge } from "rust-workers/rust-workers.js";
const require = createRequire(import.meta.url);
const { RustBridge } = require("../../rust-workers/rust-workers.node");

let bridge: Bridge = new RustBridge();

export default bridge;