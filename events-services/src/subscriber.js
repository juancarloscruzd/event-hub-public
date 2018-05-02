//----------------------------
// --- subscriber 
//----------------------------

'use strict';

const AWS_REGION = process.env.AWS_REGION;
const RECEIVED_EVENTS_ARN = process.env.RECEIVED_EVENTS_ARN;

const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);
const eventUtils = require('./eventUtils.js');

const sns = new AWS.SNS();
const sqs = new AWS.SQS();



//----------------------------
// --- Creates the notification topic for this type of event. The operation is Idepotent.
//----------------------------
var createEventTopic = function( eventType ) {
    var params = {
      Name: eventType
    };
    return sns.createTopic(params).promise();
  // sns.createTopic(params, function(err, topic) {
  //     cb(err, topic ? topic.TopicArn : null );
  // });
};

//----------------------------
// --- Sets the URL to be called once the event happens
//----------------------------
var setQueueCallbackHook = function(queueUrl, hookUrl) {
	var params = {
	    QueueUrl: queueUrl,
	    Tags: { 
	        'hookUrl': hookUrl
    	}
	};
	return sqs.tagQueue(params).promise();
};

//----------------------------
// --- Creates the delivery queue topic for this subscriber. The operation is Idepotent.
//----------------------------
var createSubscriberQueue = function( subscriber, hookUrl) {
    var params = {
        QueueName: "DLVRY-"+subscriber,
        Attributes: {}
    };
    return sqs.createQueue(params).promise()
    .then( function(queue) {
        return setQueueCallbackHook(queue.QueueUrl, hookUrl);
    });
};

//----------------------------
// --- Returns the ARN for the given queue
//----------------------------
var getQueueArn = function( queueUrl ) {
    var params = {
        QueueUrl: queueUrl,
        AttributeNames: ["QueueArn"]
    };

    return sqs.getQueueAttributes(params).promise();
//     cb(err, queue ? queue.Attributes.QueueArn : null);
}

//----------------------------
// --- Subscribes the given queue(For the subscriber) to the given topic (for the type of event)
//----------------------------
var subscribeQueue = function (topic, queue ) {
    var subscriptionParams = {
        'TopicArn': topic.TopicArn,
        'Protocol': 'sqs',
        'Endpoint': queue.QueueArn
    };
    return sns.subscribe(subscriptionParams).promise();
};

//----------------------------
// --- Sets permissions policy for the queue
//----------------------------
var setQueuePolicy = function(topic, queueUrl, queueArn) {

    var attributes = {
        "Version": "2008-10-17",
        "Id": queueArn + "/SQSDefaultPolicy",
        "Statement": [{
            "Sid": "Sid" + topic,
            "Effect": "Allow",
            "Principal": {
                "AWS": "*"
            },
            "Action": "SQS:SendMessage",
            "Resource": queueArn,
            "Condition": {
                "ArnEquals": {
                    "aws:SourceArn": topic
                }
            }
        }]
    };

    var params = {
        QueueUrl: queueUrl,
        Attributes: {
            'Policy': JSON.stringify(attributes)
        }
    };
    return sqs.setQueueAttributes(params ).promise();
};


//----------------------------
// --- Sunscribes the queue to a topic
//----------------------------
var subscribe = function (topic, queueUrl ) {

    getQueueArn(queueUrl)
    .then( function(queue) {
        subscribeQueue(topic, queueArn, function(errr, subscription) {
    })    

  getQueueArn(queueUrl, function(err, queueArn){
    if(err) {
      cb(err);
    } else {
      subscribeQueue(topic, queueArn, function(errr, subscription) {
        if(errr) {
          cb(errr);
        } else {
          setQueuePolicy(topic, queueUrl, queueArn, cb);          
        }
      });
    }
  });
};

//----------------------------
// --- Handles the request for subscription
//----------------------------
exports.handler = (message, context, callback) => {
    var subscription = message;

    if ( !subscription ) {
        callback("Message is not a subscription!" , message );
        return;
    }

    createEventTopic( subscription.eventType )
    .then( function( topic ) {
        return createSubscriberQueue( subscription.subscriber, subscription.hookUrl)
    })
    .then(function( queue ){
        return subscribe(topic, queue);
    }) 
    .then( function(data) {
        callback(null, subscription);
    }).catch( callback );
};