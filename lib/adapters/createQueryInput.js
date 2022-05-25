const { marshall } = require("@aws-sdk/util-dynamodb");
const {
    buildExpression,
    buildProjectionExpression
} = require("../parsers");


function createQueryInput(input) {




    const keyCondition = buildExpression(input.KeyConditionExpression);
    const projection = input.ProjectionExpression && buildProjectionExpression(input.ProjectionExpression);


    let ExpressionAttributeValues = Object.assign({ }, keyCondition.values);
    let ExpressionAttributeNames = Object.assign({ },
                                        keyCondition.names,
                                        projection && projection.names
                                    );

    if (!Object.keys(ExpressionAttributeNames).length) {
        ExpressionAttributeNames = undefined;
    }

    if (!Object.keys(ExpressionAttributeValues).length) {
        ExpressionAttributeValues = undefined;
    } else {
        ExpressionAttributeValues = marshall(ExpressionAttributeValues)
    }

    const ExclusiveStartKey = input.ExclusiveStartKey && marshall(input.ExclusiveStartKey)

    const dynInput = {
        ...input,
        KeyConditionExpression: keyCondition.expression,
        ProjectionExpression: projection && projection.expression,
        ExpressionAttributeValues,
        ExpressionAttributeNames,
        ExclusiveStartKey
    }


    return dynInput;
}



module.exports = createQueryInput;