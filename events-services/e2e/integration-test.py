#!/usr/bin/env python
from datetime import datetime
import json
import random
import time
import requests

PUBLISH_ENDPOINT = "https://z47ysltsz7.execute-api.us-east-1.amazonaws.com/beta/publish"
SUBSCRIBRE_ENDPOINT = "https://5aosdikenj.execute-api.us-east-1.amazonaws.com/beta/subscribe"

EVENTS = {
    "ACCOUNT_CREATED": "accounts_application",
    "ACCOUNT_CREATION_ERROR": "accounts_application",
    "CREDIT_REQUESTED": "lending_application",
    "CREDIT_LIMIT_REACHED": "lending_application",
    "SEND_SMS_NOTIFICATION": "notifier"
}


def get_publish_body():
    data = {}
    eventData = {}
    now = datetime.now()
    timestamp = int(now.strftime("%s")) * 1000
    EVENT_TYPE = random.choice(EVENTS.keys())
    APPLICATION = random.choice(EVENTS.values())
    #str_now = now.strftime("%s")
    data['eventType'] = EVENT_TYPE
    data['eventDate'] = timestamp
    data['application'] = APPLICATION

    price = random.random() * 100
    eventData['price'] = round(price, 2)
    eventData['ticker'] = random.choice(
        ['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV'])

    data['data'] = eventData
    return data


def get_subscribe_body(event, subscriber):
    data = {}
    data["eventType"] = event
    data["subscriber"] = subscriber
    return data


def create_subscriptions():
    for event, subscriber in EVENTS.items():
        data = json.dumps(get_subscribe_body(event, subscriber))
        print("This event {} will notify to this subscriber {}".format(
            event, subscriber))
        r = requests.post(url=SUBSCRIBRE_ENDPOINT, data=data)
        j = r.json()
        print(j)


if __name__ == '__main__':
    create_subscriptions()

    while True:
        data = json.dumps(get_publish_body())
        print(data)
        r = requests.post(url=PUBLISH_ENDPOINT, data=data)
        j = r.json()
        print(j)
