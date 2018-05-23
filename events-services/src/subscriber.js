//----------------------------
// --- subscriber 
//----------------------------

'use strict';

const AWS_REGION = process.env.AWS_REGION;

const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);

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
};

//----------------------------
// --- Sets the URL to be called once the event happens
//----------------------------
var setQueueCallbackHook = function(queueUrl, hookUrl) {
    if(!hookUrl) {
        return;
    }
    var params = {
        QueueUrl: queueUrl,
        Tags: { 
            'hookUrl': hookUrl
        }
    };
    sqs.tagQueue(params);
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
        //console.log("New queue created: " + queue.QueueUrl);
        setQueueCallbackHook(queue.QueueUrl, hookUrl);
        return queue;
    });
};

//----------------------------
// --- Returns the ARN for the given queue
//----------------------------
var getQueueArn = function( queue ) {
    var params = {
        QueueUrl: queue.QueueUrl,
        AttributeNames: ["QueueArn"]
    };

    return sqs.getQueueAttributes(params).promise()
    .then( function (loadedQueue) {
        queue.QueueArn = loadedQueue.Attributes.QueueArn;
        return queue;
    });
    
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
var setQueuePolicy = function(topic, queue) {

    var attributes = {
        "Version": "2008-10-17",
        "Id": queue.QueueArn + "/SQSDefaultPolicy",
        "Statement": [{
            "Sid": "Sid" + topic,
            "Effect": "Allow",
            "Principal": {
                "AWS": "*"
            },
            "Action": "SQS:SendMessage",
            "Resource": queue.QueueArn,
            "Condition": {
                "ArnEquals": {
                    "aws:SourceArn": topic
                }
            }
        }]
    };

    var params = {
        QueueUrl: queue.QueueUrl,
        Attributes: {
            'Policy': JSON.stringify(attributes)
        }
    };
    return sqs.setQueueAttributes(params ).promise();
};


//----------------------------
// --- Sunscribes the queue to a topic
//----------------------------
var subscribe = function (topic, queue ) {

    getQueueArn(queue)
    .then( function( loadedQueue) {
        //console.log("QueueArn loaded: " + loadedQueue.QueueArn);
        queue.QueueArn = loadedQueue.QueueArn;
        subscribeQueue(topic, queue);
        return queue;
    })
    .then(function() {
        //console.log("Queue subscribed");
        return setQueuePolicy(topic, queue);
    })
};

//----------------------------
// --- Handles the request for subscription
//----------------------------
exports.handler = (message, context, callback) => {
    var subscription = message;

    if ( !subscription || !subscription.eventType || !subscription.subscriber ) {
        callback("Message is not a subscription!" , message );
        return;
    }
    var topic;
    createEventTopic( subscription.eventType )
    .then( function( t ) {
        topic = t;
        //console.log("New topic created: " + topic.TopicArn);
        return createSubscriberQueue( subscription.subscriber, subscription.hookUrl)
    })
    .then(function( queue ){
        //console.log("Queue ready (setting Hook might be almost ready): " + queue.QueueUrl);
        return subscribe(topic, queue);
    }) 
    .then( function(data) {
        //console.log("All Done!");
        callback(null, subscription);
    }).catch( callback );
};