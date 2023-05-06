import RustBridge from "rustlang-bridge";
console.log("test");
let bridge = new RustBridge("./rust-workers/target/release/rust-workers");

bridge.rust_process.on("exit", () => {
    bridge = new RustBridge("./rust-workers/target/release/rust-workers");
    console.log("Rust thread panicked.");
});

export default bridge;