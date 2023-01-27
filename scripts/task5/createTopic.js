const {
    TopicMessageSubmitTransaction,
    TopicCreateTransaction,
    PrivateKey,
    Client,
    TopicMessageQuery
} = require("@hashgraph/sdk");
require('dotenv').config();

const clientAccId = process.env.MY_ACCOUNT_ID;
const clientPvtKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);

const account1Id = process.env.ACCOUNT_1;
const account1Key = PrivateKey.fromString(process.env.ACCOUNT1_KEY);

if (clientAccId == null || clientPvtKey == null ||
    account1Id == null || account1Key == null) {
    throw new Error("Environment variables for accounts must be present");
}

// Create our connection to the Hedera network
// The Hedera JS SDK makes this really easy!
const client = Client.forTestnet();

client.setOperator(clientAccId, clientPvtKey);

async function main() {
    const txResponse = await new TopicCreateTransaction()
    .setSubmitKey(account1Key)
    .setAdminKey(clientPvtKey)
    .freezeWith(client)
    .execute(client);
    
    //Grab the new topic ID from the receipt
    const receipt = await txResponse.getReceipt(client);

    //Log the topic ID
    topicId = receipt.topicId;
    console.log(`Topic ID ${receipt.topicId}`)

    const sendResponse =  new TopicMessageSubmitTransaction({
        topicId: topicId,
        message: `Current Time is ${new Date()}`,
    }).freezeWith(client);
    const signTx = await sendResponse.sign(account1Key);
    const txResponse1 = await signTx.execute(client);

    const receipt1 = await txResponse1.getReceipt(client);
    console.log(`Transaction status is ${receipt1.status}`);

     // Wait 5 seconds between consensus topic creation and subscription
     await new Promise((resolve) => setTimeout(resolve, 5000));

    new TopicMessageQuery()
    .setTopicId(topicId)
    .setStartTime(0)
    .subscribe(
        client,
        (message) => console.log(Buffer.from(message.contents, "utf8").toString())
    );

}

main();