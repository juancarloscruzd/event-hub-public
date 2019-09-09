"use strict";

const Promise = require("bluebird");
const AWS = require("aws-sdk");

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCOUNTID = process.env.AWS_ACCOUNTID;
const RECORD_EVENTS_BUCKET = process.env.RECORD_EVENTS_BUCKET;

AWS.config.update({ region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);

class Subscriber {
  /**
   * Constructs the Subscriber
   */
  constructor() {
    this.SNS = undefined;
    this.SQS = undefined;
    this.S3 = undefined;
    this.FIREHOSE = undefined;
  }

  /**
   * Initializes the subscriber
   */
  initialize() {
    this.SNS = new AWS.SNS();
    this.SQS = new AWS.SQS();
    this.S3 = new AWS.S3();
    this.FIREHOSE = new AWS.Firehose();
  }

  /**
   * Subscribe the given subscriber to events of the given type
   * @param {string} subscriber
   * @param {string} eventType
   * @param {string} notificationUrl
   */
  subscribeToEventType(subscriber, eventType, notificationUrl) {
    return Promise.all([
      this.createEventTopic(eventType),
      this.createSubscriberQueue(subscriber, notificationUrl)
    ]).then(results => {
      return this.subscribeQueueToTopic(results[0], results[1]);
    });
  }

  /**
   * Creates the notification topic for this type of event. The operation is Idepotent.
   * @param {*} eventType
   */
  createEventTopic(eventType) {
    if (!eventType || eventType === "") {
      throw "eventType must be set";
    }
    return this.SNS.createTopic({ Name: eventType }).promise();
  }

  /**
   * Creates the delivery queue topic for this subscriber. The operation is Idepotent.
   * @param {string} subscriber
   * @param {string} notificationUrl
   */
  createSubscriberQueue(subscriber, notificationUrl) {
    if (!subscriber) {
      throw "Subscriber must be set";
    }
    let params = {
      QueueName: `DLVRY-${subscriber}`,
      Attributes: {}
    };
    var self = this;
    return this.SQS.createQueue(params)
      .promise()
      .then(function(queue) {
        if (!notificationUrl || notificationUrl === "") {
          return queue;
        }
        let ps = {
          QueueUrl: queue.QueueUrl,
          Tags: {
            notificationUrl: notificationUrl
          }
        };
        self.SQS.tagQueue(ps);
        return queue;
      });
  }

  /**
   * Subscribe a queue to a topic
   * @param {AWS.SNS.Topic} topic
   * @param {any} queue
   */
  subscribeQueueToTopic(topic, queue) {
    return this.getQueueArn(queue).then(loadedQueue => {
      queue.QueueArn = loadedQueue.QueueArn;

      let subscriptionParams = {
        TopicArn: topic.TopicArn,
        Protocol: "sqs",
        Endpoint: queue.QueueArn
      };
      this.SNS.subscribe(subscriptionParams)
        .promise()
        .then(() => {
          return this.setQueuePolicy(topic, queue);
        });
      return queue;
    });
  }

  /**
   * Returns the ARN for the given queue
   * @param {*} queue
   */
  getQueueArn(queue) {
    let params = {
      QueueUrl: queue.QueueUrl,
      AttributeNames: ["QueueArn"]
    };

    return this.SQS.getQueueAttributes(params)
      .promise()
      .then(function(loadedQueue) {
        queue.QueueArn = loadedQueue.Attributes.QueueArn;
        return queue;
      });
  }

  /**
   * Sets permissions policy for the queue
   * @param {AWS.SNS.Topic} topic
   * @param {any} queue
   */
  setQueuePolicy(topic, queue) {
    let attributes = {
      Version: "2008-10-17",
      Id: `${queue.QueueArn}/SQSDefaultPolicy`,
      Statement: [
        {
          Sid: "Sid" + new Date().getTime(),
          Effect: "Allow",
          Principal: {
            AWS: "*"
          },
          Action: "SQS:SendMessage",
          Resource: queue.QueueArn,
          Condition: {
            ArnEquals: {
              "aws:SourceArn": topic.TopicArn
            }
          }
        }
      ]
    };

    let params = {
      QueueUrl: queue.QueueUrl,
      Attributes: {
        Policy: JSON.stringify(attributes)
      }
    };
    return this.SQS.setQueueAttributes(params).promise();
  }

  /**
   * Checks if the delivery stream exists, it creates if not. The operation is Idepotent.
   * @param {string} subscriber
   */
  async createDeliveryStream(subscriber) {
    const deliveryStreamConfig = {
      DeliveryStreamName: subscriber,
      DeliveryStreamType: "DirectPut",
      S3DestinationConfiguration: {
        BucketARN: `arn:aws:s3:::${RECORD_EVENTS_BUCKET}`,
        RoleARN: `arn:aws:iam::${AWS_ACCOUNTID}:role/firehose_delivery_role`,
        BufferingHints: {
          IntervalInSeconds: 60,
          SizeInMBs: 1
        },
        CompressionFormat: "UNCOMPRESSED",
        Prefix: subscriber + "/"
      }
    };

    const listDsParams = {
      DeliveryStreamType: "DirectPut"
    };

    const describeDsParams = {
      DeliveryStreamName: subscriber
    };

    try {
      const deliveryStreams = await this.FIREHOSE.listDeliveryStreams(
        listDsParams
      ).promise();
      const deliveryStreamIndex = deliveryStreams.DeliveryStreamNames.indexOf(
        subscriber
      );
      if (deliveryStreamIndex === -1) {
        // Create the new stream
        return this.FIREHOSE.createDeliveryStream(
          deliveryStreamConfig
        ).promise();
      } else {
        // Return the existing delivery stream
        return this.FIREHOSE.describeDeliveryStream(describeDsParams).promise();
      }
    } catch (error) {
      throw error;
    }
  }
}

exports.Subscriber = Subscriber;

/**
 * Handles the request for subscription
 */
exports.handler = (subscription, context, callback) => {
  if (!subscription || !subscription.eventType || !subscription.subscriber) {
    callback("Message is not a subscription!", subscription);
    return;
  }

  let subscriber = new Subscriber();
  let results = { ...{ request: subscription } };

  subscriber.initialize();

  subscriber
    .subscribeToEventType(
      subscription.subscriber,
      subscription.eventType,
      subscription.notificationUrl
    )
    .then(data => {
      results = { ...results, subscription: data };
      return subscriber.createDeliveryStream(subscription.subscriber);
    })
    .then(data => {
      results = { ...results, deliveryStream: data };
      callback(undefined, results);
    })
    .catch(error => {
      throw error;
    });
};
