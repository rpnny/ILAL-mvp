/**
 * ILAL ZK Proof Worker
 * 在后台线程生成零知识证明，避免阻塞 UI
 */

// 导入 SnarkJS（需要在 public 目录放置 snarkjs.min.js）
importScripts('/snarkjs.min.js');

self.onmessage = async (e) => {
  if (e.data.type === 'GENERATE_PROOF') {
    try {
      const { input, wasmPath, zkeyPath } = e.data;

      // 发送进度：开始加载
      self.postMessage({
        type: 'PROGRESS',
        progress: 0.1,
        message: '加载电路文件...',
      });

      // 生成证明
      const startTime = Date.now();

      // 使用 PLONK 算法
      const { proof, publicSignals } = await snarkjs.plonk.fullProve(
        input,
        wasmPath,
        zkeyPath
      );

      const elapsedTime = Date.now() - startTime;

      console.log(`证明生成完成，耗时: ${elapsedTime}ms`);

      // 发送结果
      self.postMessage({
        type: 'PROOF_READY',
        proof,
        publicSignals,
        elapsedTime,
      });
    } catch (error) {
      console.error('证明生成失败:', error);

      self.postMessage({
        type: 'ERROR',
        message: error.message || '证明生成失败',
      });
    }
  }
};

// Worker 就绪
self.postMessage({ type: 'READY' });
