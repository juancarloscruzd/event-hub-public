//----------------------------
// --- Listener 
//----------------------------

'use strict';


const AWS_REGION = process.env.AWS_REGION;

const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);
const eventUtils = require('./eventUtils.js');

const sqs = new AWS.SQS();
const lambda = new AWS.Lambda(;



//----------------------------
// --- Invokes the true handler for the listened message 
//----------------------------
const invokeMessageHandler = function (event, messageHandler) {
    var params = {
        FunctionName: messageHandler,
        InvocationType: 'Listener event',
        Payload: eventUtils.stringify(event)
    };
    return lambda.invoke( params ).promise();
};

//----------------------------
// --- For each message, invokes its handler 
//----------------------------
const handleMessages = function (messages, messageHandler) {
    if (messages) {
        messages.forEach( function(message) {
            invokeMessageHandler(message, messageHandler);
        });
    }
};

//----------------------------
// --- Checks for new messages on the queue 
//----------------------------
const checkForMessages = function ( queueUrl ) {
    var params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10
    };
    return sqs.receiveMessage(params).promise()
    .then( function(data){
        return data.Messages;
    });
}

//----------------------------
// --- Handles the incoming messages
//----------------------------
exports.handler = (message, context, callback) => {
    var messageQueueUrl = event.Body.Messages.messageQueueUrl;

    checkForMessages( messageQueueUrl, function(err, data) {
        if (err) {
            callback("Error receiving messages:\n" + err);
        } else {
            handleMessages(data.Messages, messageHandler, callback);
        }
    });

    checkForMessages( messageQueueUrl)
    .then(function( messages ) {
        return handleMessages(messages, messageHandler);
    .then(function(data) {
        callback(null, message);
    }).catch( callback );

};