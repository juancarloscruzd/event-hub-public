

#Subscribe some apps to some events
curl --header "Content-Type: application/json" --request POST --data '{"eventType":"ThisCoolEventType", "subscriber":"MyGreatSubscriber", "notificationUrl":"http://my.notification.url"}' https://8bzifhjcjl.execute-api.us-west-2.amazonaws.com/beta/subscribe
curl --header "Content-Type: application/json" --request POST --data '{"eventType":"ThisCoolEventType", "subscriber":"MyNotSoGreatSubscriber", "notificationUrl":"http://myother.notification.url"}' https://8bzifhjcjl.execute-api.us-west-2.amazonaws.com/beta/subscribe
curl --header "Content-Type: application/json" --request POST --data '{"eventType":"LittleCool", "subscriber":"MyNotSoGreatSubscriber", "notificationUrl":"http://myother.notification.url"}' https://8bzifhjcjl.execute-api.us-west-2.amazonaws.com/beta/subscribe


# Publish some events
curl --header "Content-Type: application/json" --request POST --data '{"eventType":"ThisCoolEventType", "eventDate": 1531838104011}'  https://fsks7e0uaj.execute-api.us-west-2.amazonaws.com/beta/publish
curl --header "Content-Type: application/json" --request POST --data '{"eventType":"NotCool", "eventDate": 1531838104011}' https://gzzilj22v5.execute-api.us-west-2.amazonaws.com/beta/publish
curl --header "Content-Type: application/json" --request POST --data '{"eventType":"LittleCool", "eventDate": 1531838104011}' https://gzzilj22v5.execute-api.us-west-2.amazonaws.com/beta/publish