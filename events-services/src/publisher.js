"use strict";

const Promise = require("bluebird");
const AWS = require("aws-sdk");
const eventUtils = require("./eventUtils.js");
const uuidv4 = require("uuid/v4");
const logger = require("./logger.js");

const AWS_REGION = process.env.AWS_REGION;
AWS.config.update({ region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);

/**
 * @class Publisher
 * Responsible for publish an event a General SNS topic
 */
class Publisher {
  /**
   * Creates a new Publisher
   */
  constructor() {
    this.RECEIVED_EVENTS_ARN = process.env.RECEIVED_EVENTS_ARN;
    this.SNS = undefined;
  }

  /**
   * Initializes publisher
   */
  initialize() {
    this.SNS = new AWS.SNS();
  }

  /**
   * Prepares the event for publishing, adding Metadata
   * @param {any} event
   */
  prepareEvent(event) {
    event.publishDate = new Date().getTime();
    event.publisher = "PublisherLambda";
    event.uid = uuidv4();
  }

  /**
   * Publishes the event to the intake SNS topic
   * @param {any} event
   */
  publishEvent(event) {
    this.prepareEvent(event);
    var params = {
      TopicArn: this.RECEIVED_EVENTS_ARN,
      Subject: event.eventType,
      Message: eventUtils.stringify(event)
    };

    return this.SNS.publish(params)
      .promise()
      .catch(() => "[PUBLISHER] topic does not exist");
  }
}
exports.Publisher = Publisher;

/**
 * AWS Lambda function that handles all incoming events
 */
exports.handler = (message, _context, callback) => {
  const publisher = new Publisher();
  const event = eventUtils.getOriginal(message);

  if (!event) {
    callback("Message is not an Event!", message);
    return;
  }

  publisher.initialize();
  publisher
    .publishEvent(event)
    .then(() => callback(undefined, event))
    .catch(err => {
      logger.error(err);
      callback();
    });
};
