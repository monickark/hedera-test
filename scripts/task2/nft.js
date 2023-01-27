const {
    TokenCreateTransaction,
    Client,
    TokenType,
    TokenInfoQuery,
    TokenSupplyType,
    TokenMintTransaction,
    AccountBalanceQuery, PrivateKey, Wallet, CustomFixedFee, Hbar,
    TokenId, AccountId, TransferTransaction, TokenAssociateTransaction,
    TokenPauseTransaction, TokenUnpauseTransaction, CustomRoyaltyFee
} = require("@hashgraph/sdk");
require('dotenv').config();

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

// Create our connection to the Hedera network
// The Hedera JS SDK makes this really easy!
const client = Client.forTestnet();

client.setOperator(clientAccId, clientPvtKey);

const clientUser = new Wallet(
    clientAccId,
    clientPvtKey
)

const supplyUser = new Wallet(
    account4Id,
    account4Key
)

let tokenId;

async function createToken() {
    console.log("=============== CREATE TOKEN ===============")    
    //Create the transaction and freeze for manual signing

    let nftCustomFee = new CustomRoyaltyFee()
    .setNumerator(10)
    .setDenominator(100)
    .setFeeCollectorAccountId(AccountId.fromString(account2Id))
    .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(2)));

    const transaction = new TokenCreateTransaction()
        .setTokenName("Hedera Certificate Token")
        .setTokenSymbol("HCT")
        .setTokenType(TokenType.NonFungibleUnique)
        .setTreasuryAccountId(AccountId.fromString(account1Id))
        .setInitialSupply(0)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(5)
        .setCustomFees([nftCustomFee])
        .setMaxTransactionFee(new Hbar(50))
        .setAdminKey(clientUser.publicKey)
        .setSupplyKey(supplyUser.publicKey)
        .freezeWith(client);

    //Sign the transaction with the client, who is set as admin and treasury account
    const signTx =  await transaction.sign(account1Key);

    //Submit to a Hedera network
    const txResponse = await signTx.execute(client);

    //Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the token ID from the receipt
    tokenId = receipt.tokenId;

    console.log("The new token ID is " + tokenId +"\n");

}

async function mint_transfer_Token() {
 //   const CID = ["NFT 1", "NFT 2", "NFT 3", "NFT 4", "NFT 5"];
    console.log("=============== MINT TOKEN TO INCREASE SUPPLY ===============")   
    //Mint another 1,000 tokens and freeze the unsigned transaction for manual signing
    const transaction = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata([Buffer.from("NFT 1"), Buffer.from("NFT 2"), Buffer.from("NFT 3"), Buffer.from("NFT 4"), Buffer.from("NFT 5")])
    .freezeWith(client);

    //Sign with the supply private key of the token 
    const signTx = await transaction.sign(account4Key);

    //Submit the transaction to a Hedera network    
    const txResponse = await signTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the transaction consensus status
    const transactionStatus = receipt.status;

    console.log("The transaction consensus status " +transactionStatus.toString());    
    
    await queryBalance(account1Id, tokenId);
    
    console.log("=============== ASSOCIATE TOKEN ===============")   
    //  must become “associated” with the token.
    let associateBuyerTx = await new TokenAssociateTransaction()
        .setAccountId(account3Id)
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(account3Key)

    //SUBMIT THE TRANSACTION
    let associateBuyerTxSubmit = await associateBuyerTx.execute(client);

    //GET THE RECEIPT OF THE TRANSACTION
    let associateBuyerRx = await associateBuyerTxSubmit.getReceipt(client);

    //LOG THE TRANSACTION STATUS
    console.log(`Token association with the other account: ${associateBuyerRx.status} \n`);

    console.log("=============== TRANSFER TOKEN ===============")   
    //Create the transfer transaction
    try {
    const transaction = new TransferTransaction()
    .addNftTransfer(TokenId.fromString(tokenId), 2, AccountId.fromString(account1Id), AccountId.fromString(account3Id))
    .freezeWith(client);

    //Sign with the supply private key of the token 
    const signTx = await transaction.sign(account1Key);

    //Sign with the account 3 private key of the token 
    const signedTx = await signTx.sign(account3Key);

    //Submit the transaction to a Hedera network    
    const txResponse = await signedTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the transaction consensus status
    const transactionStatus = receipt.status;    
    console.log("The transaction consensus status " +transactionStatus.toString());     
    console.log("The transaction Id " +txResponse.transactionId.toString()); 

    await queryBalance(account3Id, tokenId);
    await queryBalance(account1Id, tokenId);
    } catch(err){
        console.log("Error in token transfer: "+ err);
    }

}

async function queryBalance(user, tokenId) {
    //Create the query
    const balanceQuery = new AccountBalanceQuery()
        .setAccountId(user);

    //Sign with the client operator private key and submit to a Hedera network
    const tokenBalance = await balanceQuery.execute(client);
    
    console.log("The balance of the user '"+user+ "' is: " + tokenBalance.tokens.get(tokenId) +"\n");
}

async function main() {
    await createToken();
    await mint_transfer_Token();
    process.exit();
};

main();
