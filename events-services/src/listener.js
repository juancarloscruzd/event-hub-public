//----------------------------
// --- Listener 
//----------------------------

'use strict';

const AWS = require('aws-sdk');

var INTAKE_QUEUE_URL = process.env.INTAKE_QUEUE_URL;
var EVENT_DISPATCHER_WORKER = process.env.EVENT_DISPATCHER_WORKER
var AWS_REGION = process.env.AWS_REGION;

var sqs = new AWS.SQS({region: AWS_REGION});
var lambda = new AWS.Lambda({region: AWS_REGION});

//var async = require("async");

var handleEvent = function (event, callback) {
   var params = {
     FunctionName: EVENT_DISPATCHER_WORKER,
     InvocationType: 'Event',
     Payload: JSON.stringify(event)
   };

   lambda.invoke(params, callback );  
};

var isEvent = function( event ) {
    return ( event.eventDate != undefined && event.eventType != undefined)
};

var handleMessages = function (messages, callback) {
    if (messages && messages.length > 0) {
      messages.forEach(function(message) {
        if( isEvent( message )) {
          handleEvent(message, callback);
        } else {
          console.log('Message is not an event');
        }
      });


//      var invocations = [];

      // events.forEach(function(event) {
      //   invocations.push(function(callback) {
      //     handleEvent(event, callback);
      //   });
      // });
      
      // async.parallel(invocations, function(err, results) {
      //     callback(err, 'DONE');
      // });
    }
};
var receiveMessages = function (callback) {
  var params = {
    QueueUrl: INTAKE_QUEUE_URL,
    MaxNumberOfMessages: 10
  };
  
  sqs.receiveMessage(params, callback);
}


exports.handler = (event, context, callback) => {
    receiveMessages( function(err, data) {
    if (err) {
      callback(err);
    } else {
      handleMessages(data.Messages, callback);
    }
  } );
};