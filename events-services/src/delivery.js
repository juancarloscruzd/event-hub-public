//----------------------------
// --- Delivery 
//----------------------------
'use strict';


const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCOUNTID = "548067008624";//process.env.AWS_ACCOUNTID;


const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);
const eventUtils = require('./eventUtils.js');

const sqs = new AWS.SQS();
const qs = require('querystring');
const axios = require('axios');


//--------------------------------------------------------
// --- Loads the delivery URL for this queue 
//--------------------------------------------------------
const loadDeliveryUrl = function(queueUrl) {
    var params = {
        QueueUrl: queueUrl,
    };
    return sqs.listQueueTags(params).promise()
    .then( function(allQueueTags){
        var tags = ( allQueueTags && allQueueTags.Tags) ? allQueueTags.Tags : {};
        return tags;
    })
    .catch(function (error) {
        console.log("Error listing queue tags\n" + error);
    });
};

//--------------------------------------------------------
// --- Removes the message from the queue 
//--------------------------------------------------------
const deleteMessage = function (receiptHandle, queueUrl) {
  var params = {
    ReceiptHandle: receiptHandle,
    QueueUrl: queueUrl
  };
  return sqs.deleteMessage(params).promise();
};


//--------------------------------------------------------
// --- Delivers the event to the url 
//--------------------------------------------------------
const deliverEvent = function (event, deliveryUrl) {
    axios.post(deliveryUrl, event)
    .then(function (response) {
        console.log("Event delivered!")
    })
    .catch(function (error) {
        console.log("Error delivering event!")
    });
};


//--------------------------------------------------------
// --- Delivers the event 
//--------------------------------------------------------
const deliver = function (event, queueUrl ) {
    loadDeliveryUrl( queueUrl)
    .then(function(tags) {
        deliverEvent( event, tags);
    });
};


//----------------------------
// --- Handles the incoming event 
//----------------------------
exports.handler = function(message, context, callback) {
//    console.log("Received from listening:", message);
    var event = eventUtils.getOriginal(message);
    if ( !event ) {
        callback("Message is not an Event!" , message );
        return;
    }
    deliver(event, event.QueueUrl)
    .then(function(data) {
        if(message.ReceiptHandle) {
            deleteMessage(message.ReceiptHandle, message.QueueUrl);
        }
    })
    .then( function(data) {
        callback(null, event);
    })
    .catch( callback );
};
