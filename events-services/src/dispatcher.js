//----------------------------
// --- DISPATCHER 
//----------------------------
'use strict';

/*
var AWS = require("aws-sdk");
var async = require('async');

var INTAKE_QUEUE_URL = process.env.INTAKE_QUEUE_URL;
var CATCHALL_QUEUE_URL = process.env.CATCHALL_QUEUE_URL;
var AWS_REGION = process.env.AWS_REGION;

var sqs = new AWS.SQS({region: AWS_REGION});

var deleteMessage = function(receiptHandle, cb) {
  var params = {
    ReceiptHandle: receiptHandle,
    QueueUrl: INTAKE_QUEUE_URL
  };
  sqs.deleteMessage(params, cb);
};

var dispatchEvent = function(event, queue, groupId, cb) {
    var params = {
    MessageGroupId: groupId,
    MessageBody: event.Message,
    QueueUrl: queue
  };
  sqs.sendMessage(params, cb);
};

var listSubscribers = function(eventType, callback) {
  var params = {
    QueueNamePrefix: eventType
  };
  sqs.listQueues( params, callback );
};

var dispatch = function(eventString, cb) {
  var event = JSON.parse(eventString);
  var invocations = [];
  invocations.push(function(callback) {
    dispatchEvent( event, CATCHALL_QUEUE_URL, "catchAll", callback);
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

exports.handler = function(message, context, callback) {
  dispatch(message.Body, function(err, results) {
    if (err) {
       callback(err);
    } else {
      deleteMessage(message.ReceiptHandle, callback);
    }
  });
};

*/





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
  //MessageGroupId:"catchAll",
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