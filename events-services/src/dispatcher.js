//----------------------------
// --- DISPATCHER 
//----------------------------
'use strict';


const AWS_REGION = process.env.AWS_REGION;
const PUBLISHED_QUEUE_URL = process.env.PUBLISHED_QUEUE_URL;
const CATCHALL_QUEUE_URL = process.env.CATCHALL_QUEUE_URL;
const AWS_ACCOUNTID = "548067008624";//process.env.AWS_ACCOUNTID;


const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);
const eventUtils = require('./eventUtils.js');
const uuidv4 = require('uuid/v4');


const sns = new AWS.SNS();
const sqs = new AWS.SQS();


//--------------------------------------------------------
// --- Removes the message from the queue 
//--------------------------------------------------------
const deleteMessage = function ( receiptHandle ) {
    var params = {
        ReceiptHandle: receiptHandle,
        QueueUrl: PUBLISHED_QUEUE_URL
    };
    return sqs.deleteMessage(params).promise();
};


//--------------------------------------------------------
// --- Dispatches the event to the topic corresponding to it's type 
//--------------------------------------------------------
const dispatchEvent = function (event, topic) {
    var params = {
        'TopicArn': "arn:aws:sns:" + AWS_REGION + ":" + AWS_ACCOUNTID  + ":" + topic,
        'Subject': event.eventType,
        'Message': eventUtils.stringify(event),
    };
//    console.log("Dispatching to " + params.TopicArn);
    return sns.publish(params).promise();
};

//--------------------------------------------------------
// --- Sends the event to the catch all queue
//--------------------------------------------------------
const catchAll = function( event ) {
    var params = {
        MessageBody: eventUtils.stringify(event),
        QueueUrl: CATCHALL_QUEUE_URL
    };
//    console.log("event forwarded to catchAll queue", event);
    return sqs.sendMessage(params).promise();
};


//--------------------------------------------------------
// --- Dispatches the event 
//--------------------------------------------------------
const dispatch = function (event) {
    return Promise.all(catchAll( event ), dispatchEvent( event, event.eventType ));
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

    dispatch( event )
    .then(function(data) {
        deleteMessage(message.ReceiptHandle)
    })
    .then( function(data) {
        callback(null, event);
    })
    .catch( callback );
};