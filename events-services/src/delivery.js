//----------------------------
// --- Delivery 
//----------------------------
'use strict';


const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCOUNTID = "548067008624";//process.env.AWS_ACCOUNTID;

const qs = require('querystring');
const AWS = require("aws-sdk");
const axios = require('axios');

const sqs = new AWS.SQS({region: AWS_REGION});



const getQueueCallbackHook = function(queueUrl, cb) {
    var params = {
        QueueUrl: queueUrl,
    };
    sqs.listQueueTags(params, function(err, data) {
        if( err ) {
            cb( "Error listing queue tags\n" + err);
            return;
        }
        var tags = ( data && data.Tags) ? data.Tags : {};
        cb(null, tags.hookUrl);
    });
};

const deleteMessage = function (receiptHandle, queueUrl, cb) {
  var params = {
    ReceiptHandle: receiptHandle,
    QueueUrl: queueUrl
  };
  sqs.deleteMessage(params, cb);
};


const deliverEvent = function (event, hookUrl, cb) {
    axios.post(hookUrl, event)
    .then(function (response) {
        console.log("Event delivered!")
    })
    .catch(function (error) {
        console.log("Error delivering event!")
    });
};


const deliver = function (event, queueUrl, cb) {
    getQueueCallbackHook( queueUrl, function(err, hookUrl) {
        deliverEvent( event, hookUrl, cb);
    });
};


exports.handler = function(message, context, callback) {
//    console.log("Received from listening:", message);
    var event = eventUtils.getOriginal( message );
    if( event == null ) {
        callback("Message is not an Event!" , message );
        return;
    }

    deliver(event, event.QueueUrl, function(err, results) {
    if (err) {
         callback("Error delivering event\n" + err);
         return;
    } 
//    console.log("Event delivered");
    deleteMessage(message.ReceiptHandle, message.QueueUrl, callback);    
  });
};