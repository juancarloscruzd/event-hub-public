//----------------------------
// --- DISPATCHER 
//----------------------------
'use strict';

/*

const dispatchAll = function(eventString, cb) {
  var event = JSON.parse(eventString);
  var invocations = [];
  invocations.push(function(callback) {
    dispatchEvent( event, CATCHALL_QUEUE_URL, "catchAll", cb);
  });

  listSubscribers( event.eventType, function(err, data) {
    if(err) {
       cb(err);
    } else {
      for(var i = 0; i< data.QueueUrls.length; i++ ) {
        invocations.push(function(callback) {
          dispatchEvent( event, data.QueueUrls[i], event.eventType, callback);
        });
      };

      async.parallel(invocations, function(err, results) {
        cb(err, results);
      });
    }
  });
};   

*/


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

    sns.publish(params, cb);
};

const dispatchEvent = function(event, queue, groupId, cb) {
    var params = {
    //MessageGroupId: groupId,
    MessageBody: event.Message,
    QueueUrl: queue
  };
  console.log("event received to dispatch", event.Message, event);
  sqs.sendMessage(params, cb);
};

const dispatch = function (eventString, cb) {
  var event = JSON.parse(eventString);
  publishEvent( event, topic, cb);
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