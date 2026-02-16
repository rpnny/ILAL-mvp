# ZK Circuit Keys

This directory contains cryptographic keys for zero-knowledge proof generation.

## Required Files

### pot20_final.ptau (1.1 GB)

This is the Powers of Tau ceremony file required for PLONK proof generation.

**⚠️ This file is NOT included in the repository due to its large size (1.1GB).**

### Download Instructions

#### Option 1: Hermez Ceremony (Recommended)

Download from the official Hermez Powers of Tau ceremony:

```bash
cd circuits/keys
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau
mv powersOfTau28_hez_final_20.ptau pot20_final.ptau
```

Or use curl:

```bash
cd circuits/keys
curl -o pot20_final.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau
```

#### Option 2: Alternative Mirror

```bash
cd circuits/keys
wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_20.ptau -O pot20_final.ptau
```

#### Verify Download

After downloading, verify the file size:

```bash
ls -lh pot20_final.ptau
# Should show approximately 1.1G
```

## File Information

- **File**: `pot20_final.ptau`
- **Size**: ~1.1 GB
- **Purpose**: Universal trusted setup for PLONK circuits up to 2^20 constraints
- **Ceremony**: Hermez Network Powers of Tau
- **Constraints Supported**: Up to 1,048,576 (2^20)

## Why Not in Git?

This file is excluded from version control because:

1. **Size**: 1.1 GB exceeds GitHub's 100MB file size limit
2. **Immutable**: The file never changes, no need for version control
3. **Available Publicly**: Can be downloaded from trusted sources
4. **Universal**: Same file is used across many ZK projects

## Alternative: Git LFS (Optional)

If you need to track this file in Git, you can use Git LFS:

```bash
# Install Git LFS
brew install git-lfs  # macOS
# or
apt-get install git-lfs  # Ubuntu

# Enable Git LFS
git lfs install

# Track .ptau files
git lfs track "*.ptau"
git add .gitattributes
git commit -m "feat: track .ptau files with Git LFS"

# Add the file
git add pot20_final.ptau
git commit -m "feat: add Powers of Tau ceremony file via Git LFS"
git push
```

## Security Notes

- ✅ The Hermez ceremony is audited and trusted
- ✅ Many projects (Polygon, zkSync, etc.) use these files
- ✅ You can verify the file hash matches the official ceremony

### Official Hash (SHA256)

```
e7c4eb4c98ab1ec2a9f22105c29b1ea8bbe9c1e3b0838bc4df9d13b3afc1cb1f
```

Verify:

```bash
shasum -a 256 pot20_final.ptau
```

## Troubleshooting

### Download is slow

Use a download manager or try a different mirror.

### Download failed

```bash
# Resume interrupted download with wget
wget -c https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau

# Or with curl
curl -C - -o pot20_final.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau
```

### Insufficient disk space

You need at least 2 GB free space to download and work with the circuit.

## Additional Resources

- [Hermez PowersOfTau Ceremony](https://github.com/hermeznetwork/phase2ceremony)
- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)

---

**Note**: After downloading this file, you can proceed with circuit compilation:

```bash
cd circuits
npm run build
```
