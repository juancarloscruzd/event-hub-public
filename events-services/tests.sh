sudo apt-get update && sudo apt-get install -qq -y python-pip libpython-dev
curl -O https://bootstrap.pypa.io/get-pip.py && sudo python get-pip.py
sudo pip install -q awscli --upgrade

export BUILD_NUM=${CIRCLE_BUILD_NUM}
export TEST_BUCKET_NAME=${ENTERPRISE_NAME}-${BUILD_NUM}-events
# mvn dependency:go-offline
# sudo apt-get -y -qq install awscli
aws configure set default.region us-west-2
aws s3 mb s3://${TEST_BUCKET_NAME} 
cd events-services
npm install
npm test
cd ../
zip -r events-services/src/events.zip events-services/*
aws s3 sync events-services/src s3://${TEST_BUCKET_NAME}/ --delete
aws cloudformation create-stack --stack-name ${ENTERPRISE_NAME}-${BUILD_NUM} --parameters ParameterKey=EnvironmentName,ParameterValue=${ENTERPRISE_NAME}-${BUILD_NUM} --template-url https://s3.amazonaws.com/${TEST_BUCKET_NAME}/master.yml --capabilities CAPABILITY_NAMED_IAM --region us-west-2
