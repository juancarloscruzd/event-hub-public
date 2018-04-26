//----------------------------
// --- Publisher 
//----------------------------

'use strict';

const AWS_REGION = process.env.AWS_REGION;
const RECEIVED_EVENTS_ARN = process.env.RECEIVED_EVENTS_ARN;

const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);
const eventUtils = require('./eventUtils.js');
const uuidv4 = require('uuid/v4');

const sns = new AWS.SNS();

//----------------------------
// --- Prepares the event for publishing, adding Metadata 
//----------------------------
const prepareEvent = function( event ) {
    event.publishDate = new Date().getTime();
    event.publisher = "PublisherLambda";
    event.uid = uuidv4();
};

//----------------------------
// --- Publishes the event to the intake SNS topic 
//----------------------------
const publishEvent = function (event) {
    prepareEvent( event );
    var params = {
        'TopicArn': RECEIVED_EVENTS_ARN,
        'Subject': event.eventType,
        'Message': eventUtils.stringify(event)
    };

    return sns.publish(params);
};

//----------------------------
// --- Handles the incoming event 
//----------------------------
exports.handler = (originalEvent, context, callback) => {
    var event = eventUtils.getOriginal(event);

    if ( !event ) {
        callback("Not a valid event", event);
        return;
    }
    publishEvent( event )
    .then(function(data) {
        callback(null, data);
    }).catch(function(err) {
        callback(err);
    });
};