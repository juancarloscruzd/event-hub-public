//----------------------------
// --- DISPATCHER 
//----------------------------
'use strict';


const AWS_REGION = process.env.AWS_REGION;

const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);
const eventUtils = require('./eventUtils.js');
const uuidv4 = require('uuid/v4');


class Dispatcher {
    //----------------------------
    // --- Constructs the Subscriber
    //----------------------------
    constructor( awsAccount ) {
        this.PUBLISHED_QUEUE_URL = process.env.PUBLISHED_QUEUE_URL;
        this.CATCHALL_QUEUE_URL = process.env.CATCHALL_QUEUE_URL;
        this.AWS_ACCOUNTID = awsAccount;//"548067008624";//process.env.AWS_ACCOUNTID;
        this.sns = undefined;
        this.sqs = undefined;
    }

    //----------------------------
    // --- Initializes the subscriber
    //----------------------------
    init() {
        this.sns = new AWS.SNS();
        this.sqs = new AWS.SQS();
    }
    //--------------------------------------------------------
    // --- Removes the message from the queue 
    //--------------------------------------------------------
    deleteMessage ( receiptHandle ) {
        var params = {
            ReceiptHandle: receiptHandle,
            QueueUrl: this.PUBLISHED_QUEUE_URL
        };
        return this.sqs.deleteMessage(params).promise();
    }
    //--------------------------------------------------------
    // --- Dispatches the event to the topic corresponding to it's type 
    //--------------------------------------------------------
    dispatchEvent (event, topic) {
        var params = {
            'TopicArn': "arn:aws:sns:" + AWS_REGION + ":" + this.AWS_ACCOUNTID  + ":" + topic,
            'Subject': event.eventType,
            'Message': eventUtils.stringify(event),
        };
        return this.sns.publish(params).promise();
    }

    //--------------------------------------------------------
    // --- Sends the event to the catch all queue
    //--------------------------------------------------------
    catchAll( event ) {
        var params = {
            MessageBody: eventUtils.stringify(event),
            QueueUrl: this.CATCHALL_QUEUE_URL
        };
        return this.sqs.sendMessage(params).promise();
    }
    //--------------------------------------------------------
    // --- Dispatches the event 
    //--------------------------------------------------------
    dispatch (event) {
        let ps = [];
        var self = this;
        ps.push(this.catchAll( event ));
        ps.push(this.dispatchEvent( event, event.eventType ));

        return Promise.all(ps);
    }

};

exports.Dispatcher = Dispatcher;


//----------------------------
// --- Handles the incoming event 
//----------------------------
exports.handler = function(message, context, callback) {

    var event = eventUtils.getOriginal(message);
    if ( !event ) {
        callback("Message is not an Event!" , message );
        return;
    }
    let dispatcher = new Dispatcher("548067008624");
    dispatcher.init();

    dispatcher.dispatch( event ).then(function(data) {
        if(message.ReceiptHandle) {
            return dispatcher.deleteMessage(message.ReceiptHandle)
        }
        return false;
    })
    .then( function(data) {
        callback(undefined, event);
    })
    .catch( callback );
};