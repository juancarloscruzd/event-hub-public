export BUCKET_NAME="cf-adl-event-hub"
export ENTERPRISE_NAME="adl"
export BUILD_NUM="1"

#aws configure set default.region us-east-1
#aws s3 mb s3://${BUCKET_NAME}-events
#zip -r src/events.zip ./*
#zip events-services/src/events.zip events-services/src/*.js
zip -r events-services/src/events.zip events-services/src/*.js events-services/node_modules events-services/package.json
aws s3 sync events-services/src s3://${BUCKET_NAME}-events/ --delete
aws cloudformation create-stack --stack-name adl-event-hub --parameters ParameterKey=EnvironmentName,ParameterValue=${BUCKET_NAME} --template-url https://s3.amazonaws.com/${BUCKET_NAME}-events/master.yml --capabilities CAPABILITY_NAMED_IAM --region us-east-1
