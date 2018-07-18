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
    // --- Dispatches the event to the topic corresponding to it's type 
    //--------------------------------------------------------
    dispatchEvent (event, topic) {
        var params = {
            'TopicArn': "arn:aws:sns:" + AWS_REGION + ":" + this.AWS_ACCOUNTID  + ":" + topic,
            'Subject': event.eventType,
            'Message': eventUtils.stringify(event),
        };
        console.log( params );
        return this.sns.publish(params).promise();
    }

    //--------------------------------------------------------
    // --- Sends the event to the catch all queue
    //--------------------------------------------------------
    catch( event ) {
        var params = {
            MessageBody: eventUtils.stringify(event),
            QueueUrl: this.CATCHALL_QUEUE_URL
        };
        return this.sqs.sendMessage(params).promise();
    }
    //--------------------------------------------------------
    // --- Dispatches the events
    //--------------------------------------------------------
    dispatchAll(events) {
        let ps = [];
        var self = this;
        for( var i = 0; i < events.length; i++) {
            let event = events[i];
            ps.push(this.catch( event ));
            ps.push(this.dispatchEvent( event, event.eventType ));            
        }

        return Promise.all(ps);
    }

};

exports.Dispatcher = Dispatcher;


//----------------------------
// --- Handles the incoming event 
//----------------------------
exports.handler = function(sqsEvent, context, callback) {
    let dispatcher = new Dispatcher("548067008624");
    dispatcher.init();
    var errors = [];
    var events = [];
    let records = sqsEvent.Records;

    for( var i = 0; i < records.length; i++) {
        var event = eventUtils.getOriginal( JSON.parse(records[i].body));
        if ( !event ) {
            errors.push("Message "+i+"is not an Event: " + records[i] );
        } else {
            events.push(event);
        }
    }

    dispatcher.dispatchAll( events ).then( function(data) {
        callback(undefined, events);
    })
    .catch( callback );
};