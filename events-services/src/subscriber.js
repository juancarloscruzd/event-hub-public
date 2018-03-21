//----------------------------
// --- subscriber 
//----------------------------

'use strict';

const AWS = require('aws-sdk');

var AWS_REGION = process.env.AWS_REGION;

var sqs = new AWS.SQS({region: AWS_REGION});

exports.handler = (event, context, callback) => {
    if (err) {
      callback(err);
    } else {
      callback(null, "subscriber");
    }
};