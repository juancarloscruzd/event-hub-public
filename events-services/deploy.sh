aws configure set default.region us-west-2
aws s3 mb s3://${BUCKET_NAME} 
zip -r events-services/src/events.zip events-services/src/*
aws s3 sync events-services/src s3://${BUCKET_NAME}/ --delete
aws cloudformation create-stack --stack-name ${ENTERPRISE_NAME}-${BUILD_NUM} --parameters ParameterKey=EnvironmentName,ParameterValue=${ENTERPRISE_NAME}-${BUILD_NUM} --template-url https://s3.amazonaws.com/${BUCKET_NAME}/master.yml --capabilities CAPABILITY_NAMED_IAM --region us-west-2