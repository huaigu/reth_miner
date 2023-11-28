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
      logInfo(`solution found: ${hashed_solution}`);
      solution = potential_solution;
      break;
    }
  }
};

async function mine_rETH(idx) {
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
  const ga = gasPrice.add(ethers.utils.parseUnits("3", "gwei"));
  const tx = {
    from: account,
    to: account, // Self-transfer
    nonce: nonce,
    gasPrice: ga,
    gasLimit: ethers.utils.hexlify(26000),
    data: dataHex,
    chainId: 1,
  };

  const signedTx = await wallet.signTransaction(tx);
  const receipt = await provider.sendTransaction(signedTx);
  //await to confirm
  await provider.waitForTransaction(receipt.hash);
  logInfo(`Successful minted rETH: ${receipt.hash}`);

  //async show gas consumption and balance
  if (idx % 4 == 0) {
    showGasConsumptionAndBalance(receipt.hash);
  }
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const showGasConsumptionAndBalance = async (txHash) => {
  const receipt = await provider.getTransactionReceipt(txHash);
  const balance = await provider.getBalance(account);
  console.log(`===Your balance: ${balance}===`);
  

  // estimate how many reths you can mint base on current tx gas used and current balance
  const estimateReth = Math.floor(balance / receipt.gasUsed /receipt.gasPrice  / 1e9);
  console.log(
    `====You can mint rETH base on current balance: ${estimateReth}====`
  );
};

const main = async () => {
  let mintedCount = 0;
  while (true) {
    logInfo(`#-${mintedCount}: Calculating solution...`);
    computeHash();
    try {
      await mine_rETH(mintedCount);
      mintedCount++;
    } catch(ex) {
      console.error(ex)
      logInfo(`#-${mintedCount}: Failed to mint rETH`);
    }
  }
};

const logInfo = (msg) => {
  // log with datetime
  console.log(`[${new Date().toLocaleString()}]: ${msg}`);
};

main();
