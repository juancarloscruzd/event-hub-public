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

//----------------------------
// --- checks the queue of published events
//----------------------------
const listenPublishedEvents = function () {
    return invokeListener(PUBLISHED_QUEUE_URL);
}

//----------------------------
// --- checks all the delivery  queues
//----------------------------
const listenDispatchedEvents = function () {
    var params = {
      QueueNamePrefix: eventUtils.SUBSCRIBER_QUEUE_PREFIX
    };

    sqs.listQueues(params).promise()
    .then( function( data) {
        data.QueueUrls.forEach( function(queue){
            invokeListener(queue);
        });
    });
}


//----------------------------
// --- Handles the scheduled event 
//----------------------------
exports.handler = (event, context, callback) => {

//    console.log("Schedule Event received" );
    listenPublishedEvents();
    listenDispatchedEvents();
    callback(null, event);
};