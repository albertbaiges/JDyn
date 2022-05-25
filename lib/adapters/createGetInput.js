const { marshall } = require("@aws-sdk/util-dynamodb");
const { buildProjectionExpression } = require("../parsers");


function createGetInput(input) {

    const Key = marshall(input.Key);

    const projection = input.ProjectionExpression && buildProjectionExpression(input.ProjectionExpression);

    if (projection && !Object.keys(projection.names).length) {
        projection.names = undefined;
    }


    const dynInput = {
        ...input,
        Key,
        ProjectionExpression: projection && projection.expression,
        ExpressionAttributeNames: projection && projection.names
    }

    return dynInput;

}


module.exports = createGetInput;

