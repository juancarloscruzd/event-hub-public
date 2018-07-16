//----------------------------
// --- Listener 
//----------------------------
'use strict';


const AWS_REGION = process.env.AWS_REGION;

const Promise = require("bluebird");
const AWS = require('aws-sdk');
AWS.config.update({region: AWS_REGION });
AWS.config.setPromisesDependency(Promise);
const eventUtils = require('./eventUtils.js');

class Listener {
    //----------------------------
    // --- Constructs the Subscriber
    //----------------------------
    constructor( awsAccount ) {
        this.lambda;
        this.sqs;
    }

    //----------------------------
    // --- Initializes the subscriber
    //----------------------------
    init() {
        this.lambda = new AWS.Lambda();
        this.sqs = new AWS.SQS();
    }

    //----------------------------
    // --- Invokes the true handler for the listened message 
    //----------------------------
    invokeMessageHandler (event, messageHandler) {
        var params = {
            FunctionName: messageHandler,
            InvocationType: 'Listener event',
            Payload: eventUtils.stringify(event)
        };
        return this.lambda.invoke( params ).promise();
    };

    //----------------------------
    // --- For each message, invokes its handler 
    //----------------------------
    handleMessages (messages, messageHandler) {
        let ps = [];
        var self = this;
        if (!messages ) {
            return Promise.resolve(true);
        }
        messages.forEach( function(message) {
            ps.push(self.invokeMessageHandler(message, messageHandler));
        });
        return Promise.all(ps);
    };

    //----------------------------
    // --- Checks for new messages on the queue 
    //----------------------------
    checkForMessages ( queueUrl ) {
        var params = {
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10
        };
        return this.sqs.receiveMessage(params).promise()
        .then( function(data){
            return data.Messages;
        });
    }


};
exports.Listener = Listener;

//----------------------------
// --- Handles the incoming messages
//----------------------------
exports.handler = (message, context, callback) => {
    var messageQueueUrl =JSON.parse( message.Body.Message).messageQueueUrl;

    let messageHandler = "dispatcher";
    let listener = new Listener();
    listener.init();
    listener.checkForMessages( messageQueueUrl).then(function( messages ) {
        return listener.handleMessages(messages, messageHandler);
    }).then(function(data) {
        callback(undefined, message);
    }).catch( callback );

};