//----------------------------
// --- DISPATCHER 
//----------------------------
'use strict';


const AWS = require("aws-sdk");

const PUBLISHED_QUEUE_URL = process.env.PUBLISHED_QUEUE_URL;
const CATCHALL_QUEUE_URL = process.env.CATCHALL_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCOUNTID = "548067008624";//process.env.AWS_ACCOUNTID;

const sqs = new AWS.SQS({region: AWS_REGION});
const sns = new AWS.SNS({region: AWS_REGION});
const eventUtils = require('./eventUtils.js');


const deleteMessage = function (receiptHandle, cb) {
  var params = {
    ReceiptHandle: receiptHandle,
    QueueUrl: PUBLISHED_QUEUE_URL
  };
  sqs.deleteMessage(params, cb);
};


const dispatchEvent( event, cb); = function (event, topic, cb) {
    var params = {
        'TopicArn': "arn:aws:sns:"+AWS_REGION+":"+AWS_ACCOUNTID +":"+topic,
        'Subject': event.eventType,
        'Message': eventUtils.toString(event),
    };
//    console.log("Dispatching to " + params.TopicArn);
    sns.publish(params, cb);
};

const catchAll = function(event, cb) {
    var params = {
        MessageBody: eventUtils.toString(event),
        QueueUrl: CATCHALL_QUEUE_URL
    };
//    console.log("event forwarded to catchAll queue", event);
    sqs.sendMessage(params, cb);
};

const dispatch = function (event, cb) {
    catchAll( event, cb);
    dispatchEvent( event, event.eventType, cb);
};


exports.handler = function(message, context, callback) {
//    console.log("Received from listening:", message);
    var event = eventUtils.getOriginal( message );
    if( event == null ) {
        callback("Message is not an Event!" , message );
        return;
    }
    dispatch( event, function(err, results) {
        if (err) {
            callback("Error dispatching event:\n" + err);
            return;
        }
//        console.log("Event dispatched successfully");
        deleteMessage(message.ReceiptHandle, callback);
    });
};