//----------------------------
// --- Publisher 
//----------------------------

'use strict';

const AWS_REGION = process.env.AWS_REGION;
const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);
const eventUtils = require('./eventUtils.js');
const uuidv4 = require('uuid/v4');


class Publisher {
    //----------------------------
    // --- Constructs the Publisher
    //----------------------------
    constructor() {
        this.RECEIVED_EVENTS_ARN = process.env.RECEIVED_EVENTS_ARN;
        this.sns = undefined;        
    }

    //----------------------------
    // --- Initializes the Publisher
    //----------------------------
    init() {
        this.sns = new AWS.SNS();
    }

    //----------------------------
    // --- Prepares the event for publishing, adding Metadata 
    //----------------------------
    prepareEvent( event ) {
        event.publishDate = new Date().getTime();
        event.publisher = "PublisherLambda";
        event.uid = uuidv4();
    }

    //----------------------------
    // --- Publishes the event to the intake SNS topic 
    //----------------------------
    publishEvent (event) {
        this.prepareEvent( event );
        var params = {
            'TopicArn': this.RECEIVED_EVENTS_ARN,
            'Subject': event.eventType,
            'Message': eventUtils.stringify(event)
        };
        var prom = this.sns.publish(params).promise();
        return prom.catch(function( err ){
            return "topic does not exist";
        });
    }
};
exports.Publisher = Publisher;

//----------------------------
// --- Handles the incoming event 
//----------------------------
exports.handler = (message, context, callback) => {
    var event = eventUtils.getOriginal(message);

    if ( !event ) {
        callback("Message is not an Event!" , message );
        return;
    }
    let publisher = new Publisher();
    publisher.init();

    publisher.publishEvent( event ).then(function(data) {
        callback(undefined, event);
    }).catch( callback );
};