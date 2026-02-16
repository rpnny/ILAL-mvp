# Download Powers of Tau File

## 📥 Required File

**File**: `pot20_final.ptau`  
**Size**: 1.1 GB  
**Purpose**: Required for generating PLONK zero-knowledge proofs

---

## 🔗 Download Location

Due to GitHub's 100MB file size limit, this file is not included in the repository.

### Option 1: Hermez Network (Official)
```bash
cd circuits/keys
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau -O pot20_final.ptau
```

### Option 2: Trusted Setup Ceremony
Visit: https://github.com/iden3/snarkjs#7-prepare-phase-2

### Option 3: Generate Locally (Advanced)
```bash
npm install -g snarkjs
snarkjs powersoftau new bn128 20 pot20_0000.ptau
# ... follow full Powers of Tau ceremony
```

---

## ✅ Verification

After download, verify the file:
```bash
ls -lh pot20_final.ptau
# Should show ~1.1GB

shasum -a 256 pot20_final.ptau
# Compare with official checksum
```

---

## 📝 Note

This file is only needed if you want to:
- Regenerate ZK proof keys
- Modify the circuit
- Run the full circuit compilation

For using the existing deployed system, the compiled `.zkey` files are sufficient.
