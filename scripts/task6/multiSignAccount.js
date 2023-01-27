const { 
    Client, 
    PrivateKey, 
    TransferTransaction,
    AccountId,
    AccountBalanceQuery,
    AccountCreateTransaction, Hbar, KeyList} 
    = require("@hashgraph/sdk");
require("dotenv").config();

const clientAccId = process.env.MY_ACCOUNT_ID;
const clientPvtKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);

const account1Id = process.env.ACCOUNT_1;
const account1Key = PrivateKey.fromString(process.env.ACCOUNT1_KEY);

const account2Id = process.env.ACCOUNT_2;
const account2Key = PrivateKey.fromString(process.env.ACCOUNT2_KEY);

const account3Id = process.env.ACCOUNT_3;
const account3Key = PrivateKey.fromString(process.env.ACCOUNT3_KEY);

const account4Id = process.env.ACCOUNT_4;
const account4Key = PrivateKey.fromString(process.env.ACCOUNT4_KEY);

if (clientAccId == null || clientPvtKey == null ||
    account1Id == null || account1Key == null ||
    account2Id == null || account2Key == null ||
    account3Id == null || account3Key == null ||
    account4Id == null || account4Key == null) {
    throw new Error("Environment variables for accounts must be present");
}

const client = Client.forTestnet();
client.setOperator(clientAccId, clientPvtKey);
let multiSignAccountId;

async function createMultiSignAccount() {
    try {
    //Create a list of the keys
    const publicKeyList = [];        
    publicKeyList.push(account1Key);
    publicKeyList.push(account2Key);
    publicKeyList.push(account3Key);

    //Create a key list where all 3 keys are required to sign
    const keys = new KeyList(publicKeyList, 2);

    //Create a new account with 1,000 tinybar starting balance
    const multiSignAccount = await new AccountCreateTransaction()
        .setKey(keys)
        .setInitialBalance(Hbar.fromString(`20`))
        .execute(client);

    // Get the new account ID
    const getReceipt = await multiSignAccount.getReceipt(client);
    multiSignAccountId = getReceipt.accountId;

    console.log("The new account ID is: " +multiSignAccountId);
    } catch (err) {
        console.log("Token Creation error: "+ err);
    }

}
async function failureTransfer() {
    
    console.log("========= FAILURE TRANSFER =============")
    try{
    // check balance before transfer
    await checkBalance();

    // Create the transfer transaction
    const transferTransaction = new TransferTransaction()
    .addHbarTransfer(AccountId.fromString(multiSignAccountId), new Hbar(-10))
    .addHbarTransfer(AccountId.fromString(account4Id), new Hbar(10))
    .setNodeAccountIds([new AccountId(3)])
    .freezeWith(client);

    const signedTxn = await transferTransaction.sign(account1Key);
  
    //Sign with the client operator key to pay for the transaction and submit to a Hedera network
    const txResponse = await signedTxn.execute(client);
  
    //Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    // Get the transaction consensus status
    const transactionStatus = receipt.status;

    console.log("The transaction consensus status is " + transactionStatus.toString());
    
    // checking balance after transfer
    await checkBalance();
    } catch (err) {
        console.log("Transfer error: "+ err);
    }
}

async function successTransfer() {

    console.log("========= SUCCESS TRANSFER =============")
    try {
    // check balance before transfer
    await checkBalance();

    // Create the transfer transaction
    const transferTransaction = new TransferTransaction()
    .addHbarTransfer(AccountId.fromString(multiSignAccountId), new Hbar(-10))
    .addHbarTransfer(AccountId.fromString(account4Id), new Hbar(10))
    .setNodeAccountIds([new AccountId(3)])
    .freezeWith(client);

    const signedTxn = await transferTransaction.sign(account1Key);

    const multiSignedTxn = await signedTxn.sign(account2Key);
  
    //Sign with the client operator key to pay for the transaction and submit to a Hedera network
    const txResponse = await multiSignedTxn.execute(client);
  
    //Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    // Get the transaction consensus status
    const transactionStatus = receipt.status;

    console.log("The transaction consensus status is " + transactionStatus.toString());
    
    // checking balance after transfer
    await checkBalance();
    } catch (err) {
        console.log("Transfer error: "+ err);
    }
}

async function checkBalance(){
   // Create the queries
   const balMulti = new AccountBalanceQuery().setAccountId(multiSignAccountId);
   const balAcc4 = new AccountBalanceQuery().setAccountId(account4Id);

   const accountBalanceMine = await balMulti.execute(client);
   const accountBalanceOther = await balAcc4.execute(client);

   console.log(`MUlti signer account balance ${accountBalanceMine.hbars} HBar, Account_4 balance ${accountBalanceOther.hbars}`);
 
}

async function main() {
    await createMultiSignAccount();
    await failureTransfer();
    await successTransfer();
}

main();