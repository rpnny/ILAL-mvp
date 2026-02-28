import 'dotenv/config';

const API_BASE = 'http://localhost:3001/api/v1';

const validProof = [
    "0x2fa0fe6d5e2f705719e5ec98f54bc3c339b279a527b4dad3766d6ff304c7cd87",
    "0x255154c651faf5c0cd1cebf07e6da61fabee7f360d9c4d9b31cbc597cae08fd2",
    "0x1aeb13fea4cfb6837373af4a4ab42f4e2de2544e5c28d873b556590acccf0de4",
    "0x0bedbc11d010f624cec4bd34ba2f4651a48c1d513d4a94559ccfdd8566e1015f",
    "0x14f3928c5ec77252f8d260a0d10f67d4b948ed251a29f47f967b4c9b3f2f8fc8",
    "0x1e7bbf60e0357cd9b09bb08af206cb190fef0032402097ff5ddc6d4ab325f4b9",
    "0x1f4c0f8d0255f075c822361dcd3009918be0f3f6068db819d9b72ce971eabbbf",
    "0x0d79caeff4319a94b82eee1cce764c6a98b045d49e42aa6cbca41e4c8c9c1ce9",
    "0x05f010ba96b18ac645681da549321124e6ce5bb00895d2635cacb7703715aff1",
    "0x0de1c57ee6840a08e72d5325240d809f5611db85ece32dd06a01e5745fffbe2a",
    "0x24830ac393b5ad0bb8160255c911e10db4423d4174114da504e7321d77d68153",
    "0x10f2ffad177950a3b295fd01e94606cb9ae95cb421034097c213b2dd790c3381",
    "0x0f020008b042e92ee3af38414e6c1d503d365c1a196d35603dec17dc610448d4",
    "0x302ee537e83baf083176537887182cf52334fbe0533eee9b7664680e3219e676",
    "0x0870dc095868f908fb28f05bb2ced4e7d1418c531f39cac4061f5630234cf21d",
    "0x26866b1bdebe7a3be88c3912f9581725b875ed53065230d602acef00b87f729e",
    "0x2d0457c69df342b4ba9553b80ef6442f0e910a92a05949739919abcae3464be5",
    "0x00ce06e4c018628e6c0622f5368dc0786a54ca72c43b93097e4d7600e4ea8f6e",
    "0x0f03617a84c8df6935193ef4504eb0e96beeebb717cf43328034b07b40a49551",
    "0x14d4bfd1a4c0923b936297cc11c6fa6ae0f4fd7f75f0bcc3f892eae36b179e81",
    "0x09983d6988899e5489bc15233977d1a19985f37c623752fd6afcd1f86edd099a",
    "0x25962d0bbd8c4f9aa90a5c77aa836d87f52a387c4fb3a4b0b883484e594b0668",
    "0x2971b4bcc84caa28933e358c64c957eda70050d5b8f084fc0b8bcd4122f76976",
    "0x0073754f3f9b59faaad10de3477fd9f40acc80a963b15c195f13384dd3d865f0"
];

let proofHexStr = "0x";
for (let i = 0; i < validProof.length; i++) {
    proofHexStr += validProof[i].replace("0x", "").padStart(64, '0');
}

// 对应 RealPlonkProof.t.sol 中的有效输入
const publicInputs = [
    "1390849295786071768276380950238675083608645509734",
    "16656510059435459681513198351861654749764021936351048812511517263214375261742",
    "305171102522423601911163225780764181897910540270"
];

const userAddressHex = "0x" + BigInt(publicInputs[0]).toString(16).padStart(40, '0');

async function testZkVerify() {
    console.log("Testing ZK Verification endpoint...");
    console.log(`User Address parsed from inputs: ${userAddressHex}`);

    // 1. 测试无效 Proof 处理
    const invalidRes = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'ilal_live_c51e5aa7210e53a5fc033191b1ecfd16c2c48f81b6cd24e7' },
        body: JSON.stringify({
            userAddress: userAddressHex,
            proof: "0xdeadbeef",
            publicInputs: publicInputs
        })
    });
    console.log('--- INVALID PROOF TEST ---');
    console.log('Status:', invalidRes.status);
    console.log('Response:', await invalidRes.json());
    console.log('');

    // 2. 测试有效 Proof 验证与 Session 激活
    const validRes = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'ilal_live_c51e5aa7210e53a5fc033191b1ecfd16c2c48f81b6cd24e7' },
        body: JSON.stringify({
            userAddress: userAddressHex,
            proof: proofHexStr,
            publicInputs: publicInputs
        })
    });
    console.log('--- VALID PROOF TEST ---');
    console.log('Status:', validRes.status);
    console.log('Response:', await validRes.json());
    console.log('');

    // 3. 测试 Session 查询接口
    const sessionRes = await fetch(`${API_BASE}/session/${userAddressHex}`);
    console.log('--- SESSION STATUS TEST ---');
    console.log('Status:', sessionRes.status);
    console.log('Response:', await sessionRes.json());
    console.log('');
}

testZkVerify();
