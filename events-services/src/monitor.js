//----------------------------
// --- Listener 
//----------------------------

'use strict';

const LISTENER_LAMBDA_ARN = process.env.LISTENER_LAMBDA_ARN;
const PUBLISHED_QUEUE_URL = process.env.PUBLISHED_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const AWS = require('aws-sdk');
const sqs = new AWS.SQS({region: AWS_REGION});
const lambda = new AWS.Lambda({region: AWS_REGION});
const eventUtils = require('./eventUtils.js');


const invokeListener = function ( messageQueueUrl, callback) {
    var params = {
        FunctionName: LISTENER_LAMBDA_ARN,
        InvocationType: 'MONITOR',
        Payload: {
            messageQueueUrl:messageQueueUrl,
        }        
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

const listenPublishedEvents = function ( callback) {
    invokeListener(PUBLISHED_QUEUE_URL, callback);
}

const listenDispatchedEvents = function ( callback) {
    var params = {
      QueueNamePrefix: eventUtils.SUBSCRIBER_QUEUE_PREFIX
    };
    sqs.listQueues(params, function(err, data) {
        if (err) {
            callback("Error listing subscriber queues:\n" + err);
            return;
        }
        data.QueueUrls.forEach( function(queue){
            invokeListener(queue, callback);
        });
    });
    
}


exports.handler = (event, context, callback) => {
    var errors =[];
    var cb = function( err, results) {
        if(err) {
            errors.push(err);
        }
    };
    listenPublishedEvents( cb );
    listenDispatchedEvents( cb );
    for(var i=0; i < errors.length; i ++) {
        console.log( "ERROR when invoking event listener: " + error[i]);
    }
    callback(null, true)
};