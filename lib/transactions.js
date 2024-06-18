var util = require('./util.js');


var generateOutputTransactions = function (poolRecipient, recipients, rpcData) {

  var reward = rpcData.coinbasevalue;
  var rewardToPool = reward;

  var txOutputBuffers = [];

  // CommunityAutonomousAddress
  if (rpcData.CommunityAutonomousAddress) {
    var payeeReward = 0;

    payeeReward = rpcData.CommunityAutonomousValue;
    // reward -= payeeReward;
    // rewardToPool -= payeeReward;

    var payeeScript = util.addressToScript(rpcData.CommunityAutonomousAddress);
    txOutputBuffers.push(Buffer.concat([
      util.packInt64LE(payeeReward),
      util.varIntBuffer(payeeScript.length),
      payeeScript
    ]));
  }

  // ExchangeAddress
  if (rpcData.ExchangeAddress) {
    var payeeReward = 0;

    payeeReward = rpcData.ExchnageFundValue;


    // reward -= payeeReward;
    // rewardToPool -= payeeReward;

    var payeeScript = util.addressToScript(rpcData.ExchangeAddress);
    txOutputBuffers.push(Buffer.concat([
      util.packInt64LE(payeeReward),
      util.varIntBuffer(payeeScript.length),
      payeeScript
    ]));
  }


  for (var i = 0; i < recipients.length; i++) {
    var recipientReward = Math.floor(recipients[i].percent * reward);
    rewardToPool -= recipientReward;

    txOutputBuffers.push(Buffer.concat([
      util.packInt64LE(recipientReward),
      util.varIntBuffer(recipients[i].script.length),
      recipients[i].script
    ]));
  }

  txOutputBuffers.unshift(Buffer.concat([
    util.packInt64LE(rewardToPool),
    util.varIntBuffer(poolRecipient.length),
    poolRecipient
  ]));

  if (rpcData.default_witness_commitment !== undefined) {
    witness_commitment = new Buffer(rpcData.default_witness_commitment, 'hex');
    txOutputBuffers.push(Buffer.concat([
      util.packInt64LE(0),
      util.varIntBuffer(witness_commitment.length),
      witness_commitment
    ]));
  }

  return Buffer.concat([
    util.varIntBuffer(txOutputBuffers.length),
    Buffer.concat(txOutputBuffers)
  ]);

};


exports.CreateGeneration = function (rpcData, publicKey, extraNoncePlaceholder, reward, txMessages, recipients) {

  var txInputsCount = 1;
  var txOutputsCount = 1;
  var txVersion = 2;
  var txLockTime = 0;

  var txInPrevOutHash = "";
  var txInPrevOutIndex = Math.pow(2, 32) - 1;
  var txInSequence = 0xffffffff;

  //Only required for POS coins
  var txTimestamp = new Buffer([]);

  //For coins that support/require transaction comments
  var txComment = txMessages === true ?
    util.serializeString('https://github.com/zone117x/node-stratum') :
    new Buffer([]);


  var scriptSigPart1 = Buffer.concat([
    util.serializeNumber(rpcData.height),
    new Buffer([]),
    util.serializeNumber(Date.now() / 1000 | 0),
    new Buffer([extraNoncePlaceholder.length])
  ]);


  var scriptSigPart2 = util.serializeString('/nodeStratum/');

  var p1 = Buffer.concat([
    util.packUInt32LE(txVersion),
    Buffer.from("00", "hex"), // Marker for SegWit
    Buffer.from("01", "hex"), // Flag for SegWit
    txTimestamp,

    //transaction input
    util.varIntBuffer(txInputsCount),
    util.uint256BufferFromHash(txInPrevOutHash),
    util.packUInt32LE(txInPrevOutIndex),
    util.varIntBuffer(scriptSigPart1.length + extraNoncePlaceholder.length),
    scriptSigPart1
  ]);

  var outputTransactions = generateOutputTransactions(publicKey, recipients, rpcData);

  var p2 = Buffer.concat([
    // scriptSigPart2,
    Buffer.from("ffffffff", "hex"), // Flag for SegWit
    // util.packUInt32LE(txInSequence),
    //end transaction input

    //transaction output
    outputTransactions,
    //end transaction ouput
    Buffer.from("0120000000000000000000000000000000000000000000000000000000000000000000000000", "hex"),
    // util.packUInt32LE(txLockTime),
    // txComment
  ]);

  let txHex = Buffer.concat([p1, p2]).toString("hex");

  // console.log(">>>>------->", txHex);

  return [p1, p2];

};