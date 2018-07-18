//----------------------------
// --- subscriber 
//----------------------------

'use strict';

const AWS_REGION = process.env.AWS_REGION;

const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);

class Subscriber {
    //----------------------------
    // --- Constructs the Subscriber
    //----------------------------
    constructor() {
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

    //----------------------------
    // --- Subscribe the given subscriber to events of the given type
    //----------------------------
    subscribeToEventType( subscriber, eventType, notificationUrl ) {
        let ps = [];
        var self = this;
        ps.push(this.createEventTopic(eventType));
        ps.push(this.createSubscriberQueue(subscriber, notificationUrl));
        return Promise.all(ps).then(function( results ){
            return self.subscribeQueueToTopic( results[0], results[1] );
        });
    }

    //----------------------------
    // --- Creates the notification topic for this type of event. The operation is Idepotent.
    //----------------------------
    createEventTopic( eventType ) {
        if( !eventType || eventType === '') {
            throw "eventType must be set";
        }
        let params = {
          Name: eventType
        };

        return this.sns.createTopic(params).promise();
    }

    //----------------------------
    // --- Creates the delivery queue topic for this subscriber. The operation is Idepotent.
    //----------------------------
    createSubscriberQueue( subscriber, notificationUrl ) {
        if( !subscriber) {
            throw "Subscriber must be set";
        }
        let params = {
            QueueName: "DLVRY-"+subscriber,
            Attributes: {}
        };
        var self = this;
        return this.sqs.createQueue(params).promise().then( function( queue ) {
            if( !notificationUrl || notificationUrl === '') {
                return queue;
            }
            let ps = {
                QueueUrl: queue.QueueUrl,
                Tags: { 
                    'notificationUrl': notificationUrl
                }
            };
            self.sqs.tagQueue(ps);
            return queue;
        });
    }

    //----------------------------
    // --- Sunscribes the queue to a topic
    //----------------------------
    subscribeQueueToTopic ( topic, queue ) {
        var self = this;

        return this.getQueueArn(queue).then( function( loadedQueue) {
            queue.QueueArn = loadedQueue.QueueArn;

            let subscriptionParams = {
                'TopicArn': topic.TopicArn,
                'Protocol': 'sqs',
                'Endpoint': queue.QueueArn
            };
            self.sns.subscribe(subscriptionParams).promise().then(function() {
                return self.setQueuePolicy(topic, queue);
            });
            return queue;
        });
    }

    //----------------------------
    // --- Returns the ARN for the given queue
    //----------------------------
    getQueueArn( queue ) {
        let params = {
            QueueUrl: queue.QueueUrl,
            AttributeNames: ["QueueArn"]
        };

        return this.sqs.getQueueAttributes(params).promise().then( function ( loadedQueue ) {
            queue.QueueArn = loadedQueue.Attributes.QueueArn;
            return queue;
        });        
    }

    //----------------------------
    // --- Sets permissions policy for the queue
    //----------------------------
    setQueuePolicy( topic, queue ) {
        let attributes = {
            "Version": "2008-10-17",
            "Id": queue.QueueArn + "/SQSDefaultPolicy",
            "Statement": [{
                "Sid": "Sid" + new Date().getTime(),
                "Effect": "Allow",
                "Principal": {
                    "AWS": "*"
                },
                "Action": "SQS:SendMessage",
                "Resource": queue.QueueArn,
                "Condition": {
                    "ArnEquals": {
                        "aws:SourceArn": topic.TopicArn
                    }
                }
            }]
        };

        let params = {
            QueueUrl: queue.QueueUrl,
            Attributes: {
                'Policy': JSON.stringify(attributes)
            }
        };
        return this.sqs.setQueueAttributes( params ).promise();
    }

};

 exports.Subscriber = Subscriber;
// //----------------------------
// // --- Handles the request for subscription
// //----------------------------
exports.handler = (message, context, callback) => {
    var subscription = message;
    if ( !subscription || !subscription.eventType || !subscription.subscriber ) {
        callback("Message is not a subscription!" , message );
        return;
    }
    
    let subscriber = new Subscriber();
    subscriber.init();

    subscriber.subscribeToEventType(subscription.subscriber, subscription.eventType, subscription.notificationUrl).then( function(data) {
        callback(undefined, subscription);
    }).catch( callback );
};
