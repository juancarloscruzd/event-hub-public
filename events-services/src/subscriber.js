//----------------------------
// --- subscriber 
//----------------------------

'use strict';

const AWS = require('aws-sdk');

var AWS_REGION = process.env.AWS_REGION;

var sns = new AWS.SNS({region: AWS_REGION});
var sqs = new AWS.SQS({region: AWS_REGION});


var createEventTopic = function( eventType, cb) {
  var params = {
    Name: eventType
  };
  sns.createTopic(params, function(err, topic) {
      cb(err, topic ? topic.TopicArn : null );
  });
};


var createSubscriberQueue = function( subscriber, cb) {
  var params = {
    QueueName: subscriber,
    Attributes: {}
  };
  sqs.createQueue(params, function(err, queue) {
      cb(err, queue ? queue.QueueUrl : null );
  });
};

var getQueueArn = function(queueUrl, cb) {
  var params = {
    QueueUrl: queueUrl,
    AttributeNames: ["QueueArn"]
  };

  sqs.getQueueAttributes(params, function (err, queue) {
     cb(err, queue ? queue.Attributes.QueueArn : null);
  });
}

var subscribe = function (topic, queueArn, cb) {
  var subscriptionParams = {
    'TopicArn': topic,
    'Protocol': 'sqs',
    'Endpoint': queueArn
  };
  sns.subscribe(subscriptionParams, cb);

};


var setQueuePolicy = function(topic, queueUrl, queueArn, cb) {

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

  sqs.setQueueAttributes(params, function (err, policy) {
    cb( err, policy )
  });
};


var subscribeQueue = function (topic, queueUrl, cb) {
  getQueueArn(queueUrl, function(err, queueArn){
    if(err) {
      cb(err);
    } else {
      subscribe(topic, queueArn, function(errr, subscription) {
        if(errr) {
          cb(errr);
        } else {
          setQueuePolicy(topic, queueUrl, queueArn, cb);
        }
      });
    }
  });
};

exports.handler = (originalEvent, context, callback) => {
    var event = originalEvent;//JSON.parse(originalEvent.Body);
    createEventTopic( event.eventType, function(err, topic) {
      if (err) {
        callback(err);
      } else {
        createSubscriberQueue( event.subscriber, function(err, queue) {
          if (err) {
            callback(err);
          } else {
            subscribeQueue(topic, queue, callback);
          }
        });
      }
    });
};