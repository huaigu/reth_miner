const dotenv = require("dotenv");
dotenv.config();

const RPC_URL = process.env.RPC_URL;

const { ethers } = require("ethers");
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const privateKey = process.env.PRIVATEKEY;
const wallet = new ethers.Wallet(privateKey, provider);
const account = wallet.address;
const currentChallenge = ethers.utils.formatBytes32String("rETH"); //0x7245544800000000000000000000000000000000000000000000000000000000

let solution;

const computeHash = () => {
  while (1) {
    const random_value = ethers.utils.randomBytes(32);
    const potential_solution = ethers.utils.hexlify(random_value);
    const hashed_solution = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32"],
        [potential_solution, currentChallenge]
      )
    );
    if (hashed_solution.startsWith("0x7777")) {
      console.log(`solution found: ${hashed_solution}`);
      solution = potential_solution;
      break;
    }
  }
};

async function mine_rETH() {
  const jsonData = {
    p: "rerc-20",
    op: "mint",
    tick: "rETH",
    id: solution,
    amt: "10000",
  };

  const dataHex = ethers.utils.hexlify(
    ethers.utils.toUtf8Bytes(
      "data:application/json," + JSON.stringify(jsonData)
    )
  );

  const nonce = await provider.getTransactionCount(account);
  const gasPrice = await provider.getGasPrice();
  const ga = gasPrice.add(ethers.utils.parseUnits("5", "gwei"));
  const tx = {
    from: account,
    to: account, // Self-transfer
    nonce: nonce,
    gasPrice: ga,
    gasLimit: ethers.utils.hexlify(40000),
    data: dataHex,
    chainId: 1,
  };

  console.log(`tx: ${JSON.stringify(tx)}`);

  const signedTx = await wallet.signTransaction(tx);
  const receipt = await provider.sendTransaction(signedTx);
  //await to confirm
  await provider.waitForTransaction(receipt.hash);
  console.log(`minted rETH: ${receipt.hash}`);
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const main = async () => {
  let minted = 0;
  while (true) {
    console.log(`${minted}: start mining...`);
    computeHash();
    await mine_rETH();
    minted++;
  }
};

main();
