#!/usr/bin/env python
import argparse
import boto3

parser = argparse.ArgumentParser(description='Creates an SQS consumer')
parser.add_argument('name', metavar='n', nargs='+',
                    help='the queue name')

args = parser.parse_args()

print(args.name)
sqs = boto3.resource('sqs', region_name='us-east-1')

print("Start listening messages for queue: {}".format(args.name[0]))

queue = sqs.get_queue_by_name(QueueName=args.name[0])


while 1:
    messages = queue.receive_messages(WaitTimeSeconds=5)
    for message in messages:
        print("Message received: {0}".format(message.body))
        message.delete()
