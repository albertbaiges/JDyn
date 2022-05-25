
const { marshall } = require("@aws-sdk/util-dynamodb");
const { buildExpression } = require("../parsers");


function createDeleteInput(input) {

    const Key = marshall(input.Key);

    const condition = input.ConditionExpression && buildExpression(input.ConditionExpression);

    if (condition && !Object.keys(condition.values).length) {
        condition.values = undefined;
    }

    if (condition && !Object.keys(condition.names).length) {
        condition.names = undefined;
    }

    const dynInput = {
        ...input,
        Key,
        ConditionExpression: condition && condition.expression,
        ExpressionAttributeValues: condition && condition.values,
        ExpressionAttributeNames: condition && condition.names
    }

    return dynInput;

}

module.exports = createDeleteInput;