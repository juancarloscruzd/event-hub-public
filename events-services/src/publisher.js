//----------------------------
// --- Publisher 
//----------------------------

'use strict';

const AWS = require('aws-sdk');
const eventUtils = require('./eventUtils.js');

var AWS_REGION = process.env.AWS_REGION;
var RECEIVED_EVENTS_ARN = process.env.RECEIVED_EVENTS_ARN;
var sns = new AWS.SNS({region: AWS_REGION});


var validateEvent = function(event) {
    return (event.eventType != undefined && event.eventDate != undefined );
}

var publishEvent = function (event, cb) {
    event.publishDate = Date.now().getTime();
    event.publisher = "PublisherLambda";
    var params = {
        'TopicArn': RECEIVED_EVENTS_ARN,
        'Subject': event.eventType,
        'Message': JSON.stringify(event)
    };

    sns.publish(params, cb);
};



exports.handler = (originalEvent, context, callback) => {
    var event = originalEvent;
    if ( !eventUtils.isEvent(event) ) {
        callback("Not a valid event", event);
        return;
    }
    publishEvent( event, callback);
};