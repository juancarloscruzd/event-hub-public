//----------------------------
// --- DISPATCHER 
//----------------------------
'use strict';

var AWS = require("aws-sdk");

var INTAKE_QUEUE_URL = process.env.INTAKE_QUEUE_URL;
var CATCHALL_QUEUE_URL = process.env.CATCHALL_QUEUE_URL;
var AWS_REGION = process.env.AWS_REGION;

var sqs = new AWS.SQS({region: AWS_REGION});
var s3 = new AWS.S3({region: AWS_REGION});

function deleteMessage(receiptHandle, cb) {
  var params = {
    ReceiptHandle: receiptHandle,
    QueueUrl: INTAKE_QUEUE_URL
  };
  sqs.deleteMessage(params, cb);
}

function dispatch(eventString, cb) {
  var event = JSON.parse(eventString);
  var params = {
    MessageGroupId:"catchAll",
    MessageBody: event.Message,
    QueueUrl: CATCHALL_QUEUE_URL
  };
  console.log("event received to dispatch", event.Message, event);
  sqs.sendMessage(params, cb);
}   

exports.handler = function(message, context, callback) {
  console.log("Received from listening:", message);
  dispatch(message.Body, function(err, results) {
    if (err) {
       console.log("Error dispatching event", message.Body);
       callback(err);
    } else {
      console.log("Event dispatched");
      deleteMessage(message.ReceiptHandle, callback);
    }
  });
};