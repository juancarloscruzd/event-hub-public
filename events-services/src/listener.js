//----------------------------
// --- Listener 
//----------------------------

'use strict';

const AWS_REGION = process.env.AWS_REGION;

const AWS = require('aws-sdk');
const sqs = new AWS.SQS({region: AWS_REGION});
const lambda = new AWS.Lambda({region: AWS_REGION});
const eventUtils = require('./eventUtils.js');


const invokeMessageHandler = function (event, messageHandler, callback) {
    var params = {
        FunctionName: messageHandler,
        InvocationType: 'Event',
        Payload: eventUtils.toString(event)
    };

    lambda.invoke(params, callback );  
};

const handleMessages = function (messages, messageHandler, callback) {
    if (messages && messages.length > 0) {
        messages.forEach( function(message) {
            invokeMessageHandler(message, messageHandler, callback);
        });
    }
};

const receiveMessages = function (queueUrl, callback) {
    var params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10
    };
    sqs.receiveMessage(params, callback);
}


exports.handler = (event, context, callback) => {
    var messageQueueUrl = event.Body.Messages.messageQueueUrl;

    receiveMessages( messageQueueUrl, function(err, data) {
        if (err) {
            callback("Error receiving messages:\n" + err);
        } else {
            handleMessages(data.Messages, messageHandler, callback);
        }
    });
};