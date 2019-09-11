"use strict";

const Promise = require("bluebird");
const AWS = require("aws-sdk");
const eventUtils = require("./eventUtils.js");
const logger = require("./logger");

const AWS_REGION = process.env.AWS_REGION;
AWS.config.update({ region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);

/**
 *  @class Dispatcher
 *  Responsible for send each event to its destination.
 */
class Dispatcher {
  /**
   * Create a new Dispatcher
   */
  constructor() {
    this.PUBLISHED_QUEUE_URL = process.env.PUBLISHED_QUEUE_URL;
    this.CATCHALL_QUEUE_URL = process.env.CATCHALL_QUEUE_URL;
    this.AWS_ACCOUNTID = process.env.AWS_ACCOUNTID;
    this.SNS = undefined;
    this.SQS = undefined;
    this.FIREHOSE = undefined;
  }

  /**
   * Initialize dispatcher
   */
  initialize() {
    this.SNS = new AWS.SNS();
    this.SQS = new AWS.SQS();
    this.FIREHOSE = new AWS.Firehose();
  }

  /**
   * Dispatches all the incoming events to its destination
   * @param {any} events
   * @returns {Promise}
   */
  dispatchAll(events) {
    let promisesArr = [];

    events.forEach(event => {
      promisesArr.push(this.dispatchToEventsTopic(event, event.eventType));
      promisesArr.push(this.dispatchToCatchAllQueue(event));
      promisesArr.push(this.dispatchToFirehose(event));
    });

    return Promise.all(promisesArr);
  }

  /**
   * Dispatches the event to the topic corresponding to it's type
   * @param {any} event
   * @param {AWS.SNS.topicName} topicName
   * @var {AWS.SNS.PublishInput} params
   */
  dispatchToEventsTopic(event, topicName) {
    const params = {
      TopicArn: `arn:aws:sns:${AWS_REGION}:${this.AWS_ACCOUNTID}:${topicName}`,
      Subject: event.eventType,
      Message: eventUtils.stringify(event)
    };
    logger.info("[dispatchToEventsTopic]", params);
    return this.SNS.publish(params)
      .promise()
      .catch(err => logger.error("[dispatchToEventsTopic]", err));
  }

  /**
   * Sends the event to the catch all queue
   * @param {any} event
   * @var {AWS.SQS.Types.SendMessageRequest} params
   */
  dispatchToCatchAllQueue(event) {
    const params = {
      MessageBody: eventUtils.stringify(event),
      QueueUrl: this.CATCHALL_QUEUE_URL
    };
    logger.info("[dispatchToCatchAllQueue]", params);
    return this.SQS.sendMessage(params)
      .promise()
      .catch(err => logger.error("[dispatchToCatchAllQueue]", err));
  }

  /**
   * Dispatch an event to AWS Kinesis Firehose's delivery stream to be stored in a S3 bucket
   * @param {any} event
   * @var {AWS.Firehose.Types.PutRecordInput} params
   */
  dispatchToFirehose(event) {
    const params = {
      DeliveryStreamName: event.application,
      Record: { Data: new Buffer(JSON.stringify(event)) }
    };
    logger.info("[dispatchToFirehose]", params);

    return this.FIREHOSE.putRecord(params)
      .promise()
      .catch(err => logger.error("[dispatchToFirehose]", err));
  }
}

exports.Dispatcher = Dispatcher;

/**
 * AWS Lambda function that handles all incoming events
 */
exports.handler = (sqsEvent, _context, callback) => {
  let errors = [],
    events = [],
    records = sqsEvent.Records,
    dispatcher = new Dispatcher();
  dispatcher.initialize();

  for (let i = 0; i < records.length; i++) {
    let event = eventUtils.getOriginal(JSON.parse(records[i].body));
    if (!event) {
      errors.push(`Message ${i} is not an Event: ${records[i]}`);
    } else {
      events.push(event);
    }
  }

  dispatcher
    .dispatchAll(events)
    .then(() => callback(undefined, events))
    .catch(() => {
      errors.map(logger.error);
      callback();
    });
};
