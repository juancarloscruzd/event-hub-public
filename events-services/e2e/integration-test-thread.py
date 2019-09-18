#!/usr/bin/env python
from datetime import datetime
import json
import random
import time
import requests
import concurrent.futures


PUBLISH_ENDPOINT = "https://fub1tn865e.execute-api.us-east-1.amazonaws.com/beta/publish"
SUBSCRIBRE_ENDPOINT = "https://26mcj4o9g4.execute-api.us-east-1.amazonaws.com/beta/subscribe"

EVENTS = {
    "CREDIT_REQUESTED": "lending_application",
    "CREDIT_LIMIT_REACHED": "lending_application",
    "CREDIT_DENIED": "lending_application",
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
        try:
            r = requests.post(url=SUBSCRIBRE_ENDPOINT, data=data)
        except requests.exceptions.RequestException as e:
            print(e)
        j = r.json()
        print(j)


def integration_test(id):
    print("Thread {}: starting".format(id))

    while True:
        data = get_publish_body()
        print(data)
        requests.post(url=PUBLISH_ENDPOINT, data=json.dumps(data))


if __name__ == "__main__":
    create_subscriptions()

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(integration_test, range(5))
