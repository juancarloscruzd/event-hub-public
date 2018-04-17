//----------------------------
// --- DISPATCHER 
//----------------------------
'use strict';


var AWS = require("aws-sdk");

var PUBLISHED_QUEUE_URL = process.env.PUBLISHED_QUEUE_URL;
var CATCHALL_QUEUE_URL = process.env.CATCHALL_QUEUE_URL;
var AWS_REGION = process.env.AWS_REGION;
var AWS_ACCOUNTID = "548067008624";//process.env.AWS_ACCOUNTID;

var sqs = new AWS.SQS({region: AWS_REGION});
var sns = new AWS.SNS({region: AWS_REGION});
//var s3 = new AWS.S3({region: AWS_REGION});

//var async = require('async');


const deleteMessage = function (receiptHandle, cb) {
  var params = {
    ReceiptHandle: receiptHandle,
    QueueUrl: PUBLISHED_QUEUE_URL
  };
  sqs.deleteMessage(params, cb);
};


const publishEvent = function (event, topic, cb) {
    var params = {
        'TopicArn': "arn:aws:sns:"+AWS_REGION+":"+AWS_ACCOUNTID +":"+topic,
        'Subject': event.eventType,
        'Message': JSON.stringify(event)
    };
    console.log("Publishing to " + params.TopicArn);
    sns.publish(params, cb);
};

const dispatchEvent = function(event, queue, groupId, cb) {
    var params = {
    //MessageGroupId: groupId,
    MessageBody: JSON.stringify(event),
    QueueUrl: queue
  };
  console.log("event received to dispatch", event);
  sqs.sendMessage(params, cb);
};

const dispatch = function (eventString, cb) {
  var fullEvent = JSON.parse(eventString);
  var event = JSON.parse(fullEvent.Message);
  publishEvent( event, event.eventType, cb);
  dispatchEvent( event, CATCHALL_QUEUE_URL, "catchAll", cb);
};


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