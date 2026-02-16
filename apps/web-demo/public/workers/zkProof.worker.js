/**
 * ILAL ZK Proof Worker
 * 在后台线程生成零知识证明，避免阻塞 UI
 */

// 导入 SnarkJS（需要在 public 目录放置 snarkjs.min.js）
importScripts('/snarkjs.min.js');

function report(progress, message) {
  self.postMessage({ type: 'PROGRESS', progress, message });
}

self.onmessage = async (e) => {
  if (e.data.type === 'GENERATE_PROOF') {
    try {
      const { input, wasmPath, zkeyPath } = e.data;

      // 步骤 1: 通知主线程正在加载
      report(0.1, '下载电路文件 (WASM)...');

      // 预先 fetch 文件以便追踪进度
      let wasmBuffer, zkeyBuffer;
      try {
        const wasmResp = await fetch(wasmPath);
        if (!wasmResp.ok) throw new Error(`WASM 下载失败: ${wasmResp.status}`);
        wasmBuffer = await wasmResp.arrayBuffer();
        report(0.25, `WASM 已加载 (${(wasmBuffer.byteLength / 1024).toFixed(0)}KB)`);
      } catch (err) {
        throw new Error(`下载 WASM 电路失败: ${err.message}`);
      }

      report(0.3, '下载 ZKey 文件...');
      try {
        const zkeyResp = await fetch(zkeyPath);
        if (!zkeyResp.ok) throw new Error(`ZKey 下载失败: ${zkeyResp.status}`);
        zkeyBuffer = await zkeyResp.arrayBuffer();
        report(0.55, `ZKey 已加载 (${(zkeyBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
      } catch (err) {
        throw new Error(`下载 ZKey 文件失败: ${err.message}`);
      }

      // 步骤 2: 生成证明
      report(0.6, '计算 PLONK 零知识证明...');

      const startTime = Date.now();

      // 使用 snarkjs PLONK fullProve
      // snarkjs 支持传入 ArrayBuffer 作为 wasm/zkey 参数
      const { proof, publicSignals } = await snarkjs.plonk.fullProve(
        input,
        new Uint8Array(wasmBuffer),
        new Uint8Array(zkeyBuffer)
      );

      const elapsedTime = Date.now() - startTime;

      report(0.95, `证明计算完成 (${(elapsedTime / 1000).toFixed(1)}s)`);

      console.log(`[ZK Worker] 证明生成完成，耗时: ${elapsedTime}ms`);

      // 发送结果
      self.postMessage({
        type: 'PROOF_READY',
        proof,
        publicSignals,
        elapsedTime,
      });
    } catch (error) {
      console.error('[ZK Worker] 证明生成失败:', error);

      self.postMessage({
        type: 'ERROR',
        message: error.message || '证明生成失败',
      });
    }
  }
};

// Worker 就绪
self.postMessage({ type: 'READY' });
